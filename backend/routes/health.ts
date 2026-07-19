import fs from 'fs/promises';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { UPLOAD_ROOT } from '../config/storage';
import { getCertificateLifecycleHealth } from '../lib/monitoringState';

const DEFAULT_MIN_FREE_MB = 256;

async function checkStorage() {
  await fs.access(UPLOAD_ROOT, fs.constants.R_OK | fs.constants.W_OK);
  const stats = await fs.statfs(UPLOAD_ROOT);
  const freeBytes = stats.bavail * stats.bsize;
  const freeMb = Math.floor(freeBytes / 1024 / 1024);
  const configured = Number(process.env.UPLOAD_MIN_FREE_MB ?? DEFAULT_MIN_FREE_MB);
  const minFreeMb = Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_MIN_FREE_MB;

  if (freeMb < minFreeMb) {
    throw new Error('UPLOAD_STORAGE_LOW_SPACE');
  }

  return { status: 'ok', freeMb };
}

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', { logLevel: 'warn' }, async (_req, reply) => {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor(process.uptime());

    try {
      const [, storage] = await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        checkStorage(),
      ]);
      const scheduler = getCertificateLifecycleHealth();
      const schedulerFailed = scheduler.status === 'failed' || scheduler.status === 'stale';

      if (schedulerFailed) {
        return reply.code(503).send({
          status: 'error',
          timestamp,
          uptime,
          checks: { database: 'ok', storage, certificateLifecycleScheduler: scheduler },
        });
      }

      return reply.send({
        status: 'ok',
        timestamp,
        uptime,
        checks: { database: 'ok', storage, certificateLifecycleScheduler: scheduler },
      });
    } catch (error) {
      app.log.warn({ err: error }, 'Health check failed');
      return reply.code(503).send({ status: 'error', timestamp, uptime });
    }
  });
}
