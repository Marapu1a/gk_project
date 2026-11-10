import type { FastifyReply, FastifyRequest } from 'fastify';
import archiver from 'archiver';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { UPLOAD_ROOT } from '../../config/storage';
import { pauseBackupWrites } from '../../lib/backupWriteGate';
import { reportOperationalFailure } from '../../lib/errorMonitoring';

const tickets = new Map<string, { userId: string; expiresAt: number }>();
const TICKET_TTL_MS = 2 * 60_000;
let backupActive = false;

async function hardlinkTree(source: string, destination: string) {
  let count = 0;
  let bytes = 0;
  await fs.mkdir(destination, { recursive: true });

  async function visit(from: string, to: string) {
    for (const item of await fs.readdir(from, { withFileTypes: true })) {
      const fromPath = path.join(from, item.name);
      const toPath = path.join(to, item.name);
      if (item.isDirectory()) {
        await fs.mkdir(toPath);
        await visit(fromPath, toPath);
      } else if (item.isFile()) {
        await fs.link(fromPath, toPath);
        count += 1;
        bytes += (await fs.stat(fromPath)).size;
      } else {
        throw new Error(`Unsupported entry in backup source: ${fromPath}`);
      }
    }
  }

  await visit(source, destination);
  return { count, bytes };
}

async function dumpDatabase(destination: string) {
  const databaseUrl = process.env.DATABASE_URL?.split('?')[0];
  if (!databaseUrl) throw new Error('DATABASE_URL is empty');

  await new Promise<void>((resolve, reject) => {
    const child = spawn('pg_dump', ['-Fc', '-f', destination, '-d', databaseUrl], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
    });
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4000);
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}: ${stderr}`));
    });
  });
}

export async function createFullBackupTicketHandler(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: 'Недостаточно прав' });
  if (backupActive) return reply.code(409).send({ error: 'Полный бэкап уже создаётся' });

  for (const [ticket, value] of tickets) {
    if (value.expiresAt < Date.now()) tickets.delete(ticket);
  }
  const ticket = randomBytes(32).toString('hex');
  tickets.set(ticket, { userId: req.user.userId, expiresAt: Date.now() + TICKET_TTL_MS });
  return reply.send({ ticket, expiresInSeconds: TICKET_TTL_MS / 1000 });
}

export async function downloadFullBackupHandler(req: FastifyRequest, reply: FastifyReply) {
  const { ticket } = req.query as { ticket?: string };
  const grant = ticket ? tickets.get(ticket) : undefined;
  if (ticket) tickets.delete(ticket);
  if (!grant || grant.expiresAt < Date.now()) {
    return reply.code(401).send({ error: 'Ссылка на бэкап устарела. Запустите скачивание заново.' });
  }
  if (backupActive) return reply.code(409).send({ error: 'Полный бэкап уже создаётся' });
  backupActive = true;

  let stage: string | undefined;
  let resumeWrites: (() => void) | undefined;
  try {
    stage = await fs.mkdtemp(path.join(os.tmpdir(), 'cspap-full-backup-'));
    resumeWrites = await pauseBackupWrites();
    const uploads = await hardlinkTree(UPLOAD_ROOT, path.join(stage, 'uploads'));
    const data = await hardlinkTree(path.join(process.cwd(), 'data'), path.join(stage, 'app-data'));
    await dumpDatabase(path.join(stage, 'database.dump'));
    resumeWrites();
    resumeWrites = undefined;

    const createdAt = new Date().toISOString();
    const manifest = {
      format: 'cspap-full-backup-v1',
      createdAt,
      release: process.env.SENTRY_RELEASE || null,
      contents: ['database.dump', 'uploads/', 'app-data/', 'RESTORE.txt'],
      uploads,
      appData: data,
      note: 'Архив содержит персональные данные. Храните его в защищённом месте.',
    };
    await fs.writeFile(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await fs.writeFile(
      path.join(stage, 'RESTORE.txt'),
      'Полный бэкап данных ЦС ПАП.\n' +
        '1. Проверьте ZIP: unzip -t <архив>.zip.\n' +
        '2. Остановите запись данных в приложении.\n' +
        '3. Восстановите database.dump командой pg_restore в пустую БД.\n' +
        '4. Верните содержимое uploads/ в каталог UPLOAD_DIR, app-data/ в backend/data.\n' +
        '5. Разверните совместимую версию приложения из Git, настройте переменные окружения.\n' +
        '6. Проверьте /health, вход, документы и сертификаты.\n' +
        'Не восстанавливайте архив поверх работающей БД без отдельного плана восстановления.\n',
    );

    const filename = `cspap-full-${createdAt.slice(0, 19).replace(/[:T]/g, '-')}.zip`;
    const archive = archiver('zip', { zlib: { level: 1 }, forceZip64: true });
    const cleanup = async () => {
      backupActive = false;
      if (stage) await fs.rm(stage, { recursive: true, force: true });
    };
    let cleaned = false;
    const cleanOnce = () => {
      if (cleaned) return;
      cleaned = true;
      void cleanup().catch((error) => req.log.error({ err: error }, 'Full backup cleanup failed'));
    };
    archive.on('error', (error) => {
      reportOperationalFailure('full_backup_stream', error, { requestId: req.id }, req.log);
      reply.raw.destroy(error);
      cleanOnce();
    });
    archive.on('warning', (error) => {
      reportOperationalFailure('full_backup_stream', error, { requestId: req.id }, req.log);
      reply.raw.destroy(error);
      cleanOnce();
    });
    reply.raw.once('close', () => {
      if (!reply.raw.writableFinished) archive.abort();
      cleanOnce();
    });

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Accel-Buffering': 'no',
    });
    archive.pipe(reply.raw);
    archive.directory(path.join(stage, 'uploads'), 'uploads');
    archive.directory(path.join(stage, 'app-data'), 'app-data');
    archive.file(path.join(stage, 'database.dump'), { name: 'database.dump' });
    archive.file(path.join(stage, 'manifest.json'), { name: 'manifest.json' });
    archive.file(path.join(stage, 'RESTORE.txt'), { name: 'RESTORE.txt' });
    void archive.finalize().catch((error) => {
      reportOperationalFailure('full_backup_finalize', error, { requestId: req.id }, req.log);
      reply.raw.destroy(error);
      cleanOnce();
    });
  } catch (error) {
    resumeWrites?.();
    backupActive = false;
    if (stage) await fs.rm(stage, { recursive: true, force: true }).catch(() => undefined);
    reportOperationalFailure('full_backup_prepare', error, { requestId: req.id }, req.log);
    return reply.code(500).send({ error: 'Не удалось создать полный бэкап. Попробуйте позже.' });
  }
}
