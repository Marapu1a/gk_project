// /routes/documentReviewAdmin.ts
import { FastifyInstance } from 'fastify';
import { getAllDocumentReviewRequests } from '../handlers/documentReviewAdmin/getAllDocumentReviewRequests';
import { getDocumentReviewRequestById } from '../handlers/documentReviewAdmin/getDocumentReviewRequestById';
import { updateDocumentReviewRequestPaid } from '../handlers/documentReviewAdmin/updateDocumentReviewRequestPaid';
import { updateDocumentReviewFile } from '../handlers/documentReviewAdmin/updateDocumentReviewFile';
import { deleteDocumentReviewFile } from '../handlers/documentReviewAdmin/deleteDocumentReviewFile';
import { transferDocumentReviewFileToActiveCycle } from '../handlers/documentReviewAdmin/transferDocumentReviewFileToActiveCycle';

import { verifyToken } from '../middlewares/verifyToken';

export async function documentReviewRoutesAdmin(app: FastifyInstance) {

  app.get('/document-review-requests', { preHandler: [verifyToken] }, getAllDocumentReviewRequests);
  app.get('/document-review-requests/:id', { preHandler: [verifyToken] }, getDocumentReviewRequestById);
  app.patch('/document-review-requests/:id/files/:fileReviewId', { preHandler: [verifyToken] }, updateDocumentReviewFile);
  app.post('/document-review-requests/:id/files/:fileReviewId/transfer-to-active-cycle', { preHandler: [verifyToken] }, transferDocumentReviewFileToActiveCycle);
  app.delete('/document-review-requests/:id/files/:fileReviewId', { preHandler: [verifyToken] }, deleteDocumentReviewFile);
  app.patch('/document-review-requests/:id/paid', { preHandler: [verifyToken] }, updateDocumentReviewRequestPaid);
}
