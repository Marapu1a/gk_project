// src/handlers/auth/getTransborderConsentDocumentHandler.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { TRANSBORDER_CONSENT_DOCUMENT } from '../../utils/transborderConsentDocument';

export async function getTransborderConsentDocumentHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.send({
    type: TRANSBORDER_CONSENT_DOCUMENT.type,
    version: TRANSBORDER_CONSENT_DOCUMENT.version,
    title: TRANSBORDER_CONSENT_DOCUMENT.title,
    fullText: TRANSBORDER_CONSENT_DOCUMENT.fullText,
    items: TRANSBORDER_CONSENT_DOCUMENT.items,
  });
}
