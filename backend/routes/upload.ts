// backend/src/routes/upload.ts
import { FastifyInstance } from 'fastify';
import { uploadHandler } from '../handlers/upload/uploadHandler';
import { deleteUploadHandler } from '../handlers/upload/deleteUploadHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: verifyToken }, uploadHandler);
  app.delete('/upload/:fileId', { preHandler: verifyToken }, deleteUploadHandler);
}
