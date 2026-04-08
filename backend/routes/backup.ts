// routes/backup.ts
import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { createDbBackupHandler } from '../handlers/backup/createDbBackupHandler';

export async function backupRoutes(app: FastifyInstance) {
  app.get('/admin/db/backup', { preHandler: verifyToken }, createDbBackupHandler);
}
