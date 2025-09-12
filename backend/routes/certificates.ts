// src/routes/certificates.ts
import { FastifyInstance } from 'fastify';
import { issueCertificateHandler } from '../handlers/certificates/issueCertificate';
import { getMyCertificatesHandler } from '../handlers/certificates/getMyCertificates';
import { getUserCertificatesHandler } from '../handlers/certificates/getUserCertificates';
import { deleteCertificateHandler } from '../handlers/certificates/deleteCertificate';
import { verifyToken } from '../middlewares/verifyToken';

export async function certificatesRoutes(app: FastifyInstance) {
  app.post('/admin/certificates/issue', { preHandler: verifyToken }, issueCertificateHandler);
  app.delete('/admin/certificates/:id', { preHandler: verifyToken }, deleteCertificateHandler);
  app.get('/me/certificates', { preHandler: verifyToken }, getMyCertificatesHandler);
  app.get('/admin/users/:id/certificates', { preHandler: verifyToken }, getUserCertificatesHandler);
}
