// src/routes/certificates.ts
import { FastifyInstance } from 'fastify';
import { issueCertificateHandler } from '../handlers/certificates/issueCertificate';
import { getMyCertificatesHandler } from '../handlers/certificates/getMyCertificates';
import { getUserCertificatesHandler } from '../handlers/certificates/getUserCertificates';
import { deleteCertificateHandler } from '../handlers/certificates/deleteCertificate';
import { updateCertificateHandler } from '../handlers/certificates/updateCertificate';
import { getCertificatePreviewHandler } from '../handlers/certificates/getCertificatePreview';
import { verifyToken } from '../middlewares/verifyToken';
import { requireAdmin } from '../middlewares/requireRole';

export async function certificatesRoutes(app: FastifyInstance) {
  app.get('/certificates/:id/preview', getCertificatePreviewHandler);
  app.post('/admin/certificates/issue', { preHandler: [verifyToken, requireAdmin] }, issueCertificateHandler);
  app.patch('/admin/certificates/:id', { preHandler: [verifyToken, requireAdmin] }, updateCertificateHandler);
  app.delete('/admin/certificates/:id', { preHandler: [verifyToken, requireAdmin] }, deleteCertificateHandler);
  app.get('/me/certificates', { preHandler: verifyToken }, getMyCertificatesHandler);
  app.get('/admin/users/:id/certificates', { preHandler: [verifyToken, requireAdmin] }, getUserCertificatesHandler);
}
