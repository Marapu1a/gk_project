// routes/documentReview.ts
import { FastifyInstance } from 'fastify';
import { createDocumentReviewRequestHandler } from '../handlers/documentReview/createDocumentReviewRequest';
import { getDocumentReviewRequestHandler } from '../handlers/documentReview/getDocumentReviewRequestHandler';
import { updateDocumentReviewRequestHandler } from '../handlers/documentReview/updateDocumentReviewRequestHandler';
import { getDocumentReviewRequestsHandler } from '../handlers/documentReview/getDocumentReviewRequestsHandler';
import { markDocumentReviewRequestPaidHandler } from '../handlers/documentReview/markDocumentReviewRequestPaidHandler';
import { getDocumentReviewRequestsByEmailHandler } from '../handlers/documentReview/getDocumentReviewRequestsByEmailHandler';
import { updateDocumentReviewRequestStatusHandler } from '../handlers/documentReview/updateDocumentReviewRequestStatusHandler';
import { updateDocumentReviewRequestCommentHandler } from '../handlers/documentReview/updateDocumentReviewRequestCommentHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function documentReviewRoutes(app: FastifyInstance) {
  app.post('/document-review/request', { preHandler: verifyToken }, createDocumentReviewRequestHandler);
  app.get('/document-review/request', { preHandler: verifyToken }, getDocumentReviewRequestHandler);
  app.patch('/document-review/request/:id', { preHandler: verifyToken }, updateDocumentReviewRequestHandler);
  app.get('/admin/document-review/requests', { preHandler: verifyToken }, getDocumentReviewRequestsHandler);
  app.post('/admin/document-review/request/:id/pay', { preHandler: verifyToken }, markDocumentReviewRequestPaidHandler);
  app.get('/admin/document-review/requests/by-email/:email', { preHandler: verifyToken }, getDocumentReviewRequestsByEmailHandler);
  app.patch('/admin/document-review/requests/:id/status', { preHandler: verifyToken }, updateDocumentReviewRequestStatusHandler);
  app.patch('/admin/document-review/requests/:id/comment', { preHandler: verifyToken }, updateDocumentReviewRequestCommentHandler);
}
