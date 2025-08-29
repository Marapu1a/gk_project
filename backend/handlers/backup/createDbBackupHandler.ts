// handlers/backup/createDbBackupHandler.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function createDbBackupHandler(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: 'Недостаточно прав' });

  const rawUrl = process.env.DATABASE_URL || '';
  const dbUrl = rawUrl.split('?')[0]; // убираем ?schema=public и прочее
  if (!dbUrl) return reply.code(500).send({ error: 'DATABASE_URL пуст' });

  const baseDir = process.env.UPLOAD_DIR;
  if (!baseDir) return reply.code(500).send({ error: 'UPLOAD_DIR не задан' });

  // складываем в подпапку /backups внутри UPLOAD_DIR
  const backupDir = path.join(baseDir, 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  const ts = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}__${p(d.getHours())}-${p(d.getMinutes())}`;
  };

  const filename = `cspap_${ts()}.dump`;
  const filepath = path.join(backupDir, filename);

  const args = ['-Fc', '-d', dbUrl, '-f', filepath];
  const proc = spawn('pg_dump', args, { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  proc.stderr.on('data', (c) => (stderr += c.toString()));

  proc.on('error', (err) => {
    reply.code(500).send({ error: `pg_dump start error: ${String(err)}` });
  });

  proc.on('close', (code) => {
    if (code === 0) {
      // frontend будет открывать по /uploads/backups/${file}
      reply.send({ ok: true, file: filename, path: filepath });
    } else {
      reply.code(500).send({ error: `pg_dump exit ${code}`, details: stderr.trim() });
    }
  });
}
