import { FastifyInstance } from 'fastify';
import { createDocReviewReq } from '../handlers/documentReview/createDocReviewReq';
import { getDocReviewReq } from '../handlers/documentReview/getDocReviewReq';
import { verifyToken } from '../middlewares/verifyToken';

export async function documentReviewRoutes(app: FastifyInstance) {
  // Создание заявки на проверку документов
  app.post('/document-review-request', { preHandler: [verifyToken] }, createDocReviewReq);
  app.get('/document-review-request', { preHandler: [verifyToken] }, getDocReviewReq);
}
