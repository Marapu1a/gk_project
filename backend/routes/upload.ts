import { FastifyInstance } from 'fastify';
import { uploadFileToStorage } from '../handlers/upload/uploadFileToStorage';
import { deleteFileHandler } from '../handlers/upload/deleteFileHandler';
import { getUploadedFilesHandler } from '../handlers/upload/getUploadedFilesHandler';
import { updateFileHandler } from '../handlers/upload/updateFileHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: [verifyToken] }, uploadFileToStorage);
  app.get('/uploads', { preHandler: [verifyToken] }, getUploadedFilesHandler);
  app.delete('/upload/:id', { preHandler: [verifyToken] }, deleteFileHandler);
  app.patch('/upload/:id', { preHandler: [verifyToken] }, updateFileHandler);
}
