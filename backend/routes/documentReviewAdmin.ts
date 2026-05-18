// /routes/documentReviewAdmin.ts
import { FastifyInstance } from 'fastify';
import { getAllDocumentReviewRequests } from '../handlers/documentReviewAdmin/getAllDocumentReviewRequests';
import { getDocumentReviewRequestById } from '../handlers/documentReviewAdmin/getDocumentReviewRequestById';
import { updateDocumentReviewRequestStatus } from '../handlers/documentReviewAdmin/updateDocumentReviewRequestStatus';
import { updateDocumentReviewRequestPaid } from '../handlers/documentReviewAdmin/updateDocumentReviewRequestPaid';
import { updateDocumentReviewFile } from '../handlers/documentReviewAdmin/updateDocumentReviewFile';
import { deleteDocumentReviewFile } from '../handlers/documentReviewAdmin/deleteDocumentReviewFile';

import { verifyToken } from '../middlewares/verifyToken';

export async function documentReviewRoutesAdmin(app: FastifyInstance) {

  app.get('/document-review-requests', { preHandler: [verifyToken] }, getAllDocumentReviewRequests);
  app.get('/document-review-requests/:id', { preHandler: [verifyToken] }, getDocumentReviewRequestById);
  app.patch('/document-review-requests/:id/status', { preHandler: [verifyToken] }, updateDocumentReviewRequestStatus);
  app.patch('/document-review-requests/:id/files/:fileReviewId', { preHandler: [verifyToken] }, updateDocumentReviewFile);
  app.delete('/document-review-requests/:id/files/:fileReviewId', { preHandler: [verifyToken] }, deleteDocumentReviewFile);
  app.patch('/document-review-requests/:id/paid', { preHandler: [verifyToken] }, updateDocumentReviewRequestPaid);
}
