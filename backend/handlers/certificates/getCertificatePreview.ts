import fs from 'fs';
import { reportOperationalFailure } from '../../lib/errorMonitoring';
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
    reportOperationalFailure(
      'certificate_preview_generation',
      error,
      { certificateId: req.params.id, requestId: req.id },
      req.log,
    );
    return reply.code(503).send({ error: 'Не удалось подготовить превью сертификата' });
  }
}
