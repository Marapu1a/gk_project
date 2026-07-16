import fs from 'fs';
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';

import { ensureCertificatePreview } from '../../utils/certificatePreview';

interface CertificatePreviewRoute extends RouteGenericInterface {
  Params: { id: string };
}

export async function getCertificatePreviewHandler(
  req: FastifyRequest<CertificatePreviewRoute>,
  reply: FastifyReply,
) {
  try {
    const preview = await ensureCertificatePreview(req.params.id);
    if (!preview) {
      return reply.code(404).send({ error: 'Сертификат не найден' });
    }

    reply
      .type('image/png')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .header('Content-Disposition', 'inline');

    return reply.send(fs.createReadStream(preview.path));
  } catch (error) {
    req.log.error({ err: error, certificateId: req.params.id }, 'Certificate preview generation failed');
    return reply.code(503).send({ error: 'Не удалось подготовить превью сертификата' });
  }
}
