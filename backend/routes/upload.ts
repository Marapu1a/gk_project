import { FastifyInstance } from 'fastify';
import { uploadHandler } from '../handlers/upload/uploadHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: verifyToken }, uploadHandler);
}
