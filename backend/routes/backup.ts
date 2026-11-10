// routes/backup.ts
import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { createDbBackupHandler } from '../handlers/backup/createDbBackupHandler';
import {
  createFullBackupTicketHandler,
  downloadFullBackupHandler,
} from '../handlers/backup/createFullBackupHandler';

export async function backupRoutes(app: FastifyInstance) {
  app.get('/admin/db/backup', { preHandler: verifyToken }, createDbBackupHandler);
  app.post('/admin/full-backup/ticket', { preHandler: verifyToken }, createFullBackupTicketHandler);
  app.get('/admin/full-backup/download', downloadFullBackupHandler);
}
