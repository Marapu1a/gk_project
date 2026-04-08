import type { FastifyRequest, FastifyReply } from 'fastify';
import { spawn } from 'child_process';

export async function createDbBackupHandler(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const rawUrl = process.env.DATABASE_URL || '';
  const dbUrl = rawUrl.split('?')[0];

  if (!dbUrl) {
    return reply.code(500).send({ error: 'DATABASE_URL пуст' });
  }

  const ts = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}__${p(d.getHours())}-${p(d.getMinutes())}`;
  };

  const filename = `cspap_${ts()}.dump`;
  const origin = req.headers.origin;

  const corsHeaders: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  const proc = spawn('pg_dump', ['-Fc', '-d', dbUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let stderr = '';
  let finished = false;

  const finishWithJsonError = (
    statusCode: number,
    payload: { error: string; details?: string },
  ) => {
    if (finished) return;
    finished = true;

    try {
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(statusCode, {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        });
        reply.raw.end(JSON.stringify(payload));
        return;
      }

      // Если заголовки уже ушли и бинарный стрим начался,
      // JSON-ошибку уже красиво не отдать — рвём соединение.
      reply.raw.destroy(
        new Error(payload.details ? `${payload.error}: ${payload.details}` : payload.error),
      );
    } catch {
      try {
        reply.raw.destroy();
      } catch {
        // уже всё умерло, и ладно
      }
    }
  };

  const timeout = setTimeout(() => {
    proc.kill('SIGKILL');
    finishWithJsonError(500, { error: 'pg_dump timeout' });
  }, 60_000);

  proc.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  proc.on('error', (err) => {
    clearTimeout(timeout);
    finishWithJsonError(500, {
      error: `pg_dump start error: ${String(err)}`,
    });
  });

  reply.hijack();

  reply.raw.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
    ...corsHeaders,
  });

  proc.stdout.on('error', () => {
    clearTimeout(timeout);
    finishWithJsonError(500, {
      error: 'Ошибка чтения потока pg_dump',
    });
  });

  reply.raw.on('close', () => {
    if (finished) return;

    finished = true;
    clearTimeout(timeout);

    try {
      proc.kill('SIGKILL');
    } catch {
      // нормально
    }
  });

  proc.stdout.pipe(reply.raw, { end: false });

  proc.on('close', (code) => {
    clearTimeout(timeout);

    if (finished) return;

    if (code === 0) {
      finished = true;

      if (!reply.raw.writableEnded) {
        reply.raw.end();
      }
      return;
    }

    finishWithJsonError(500, {
      error: `pg_dump exit ${code}`,
      details: stderr.trim() || undefined,
    });
  });
}
