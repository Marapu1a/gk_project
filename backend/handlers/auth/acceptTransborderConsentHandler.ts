// src/handlers/auth/acceptTransborderConsentHandler.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { sendEmail } from '../../lib/mailer';
import {
  TRANSBORDER_CONSENT_DOCUMENT,
  getRequiredConsentItemCodes,
  getTransborderConsentTextHash,
  type ConsentItemCode,
} from '../../utils/transborderConsentDocument';
import {
  buildTransborderConsentEmailHtml,
  buildTransborderConsentEmailSubject,
} from '../../utils/transborderConsentEmail';

type Body = {
  acceptedItems?: Record<string, boolean> | null;
  source?: 'REGISTRATION_MODAL' | 'LEGACY_MODAL';
};

function getClientIp(req: FastifyRequest): string | null {
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0]?.trim() || null;
  }

  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0]?.split(',')[0]?.trim() || null;
  }

  return req.ip || null;
}

function getUserAgent(req: FastifyRequest): string | null {
  const userAgent = req.headers['user-agent'];
  return typeof userAgent === 'string' && userAgent.trim() ? userAgent.trim() : null;
}

function getClientId(req: FastifyRequest): string | null {
  const header = req.headers['x-client-id'];

  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }

  if (Array.isArray(header) && header.length > 0 && header[0]?.trim()) {
    return header[0].trim();
  }

  return null;
}

function normalizeAcceptedItems(
  acceptedItems: Body['acceptedItems'],
): Record<ConsentItemCode, boolean> {
  const requiredCodes = getRequiredConsentItemCodes();

  if (!acceptedItems || typeof acceptedItems !== 'object') {
    throw new Error('Не переданы подтвержденные пункты согласия');
  }

  for (const code of requiredCodes) {
    if (acceptedItems[code] !== true) {
      throw new Error('Не все обязательные пункты согласия подтверждены');
    }
  }

  const normalized = {} as Record<ConsentItemCode, boolean>;

  for (const item of TRANSBORDER_CONSENT_DOCUMENT.items) {
    normalized[item.code] = acceptedItems[item.code] === true;
  }

  return normalized;
}

export async function acceptTransborderConsentHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const { user } = req;

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const body = (req.body ?? {}) as Body;
  const source = body.source ?? 'REGISTRATION_MODAL';

  if (source !== 'REGISTRATION_MODAL' && source !== 'LEGACY_MODAL') {
    return reply.code(400).send({ error: 'Некорректный источник согласия' });
  }

  let acceptedItems: Record<ConsentItemCode, boolean>;

  try {
    acceptedItems = normalizeAcceptedItems(body.acceptedItems);
  } catch (error) {
    return reply.code(400).send({
      error: error instanceof Error ? error.message : 'Некорректные данные согласия',
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true, fullName: true },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const documentType = TRANSBORDER_CONSENT_DOCUMENT.type;
  const documentVersion = TRANSBORDER_CONSENT_DOCUMENT.version;
  const documentTextHash = getTransborderConsentTextHash();

  const existingConsent = await prisma.userConsent.findFirst({
    where: {
      userId: dbUser.id,
      documentType,
      documentVersion,
    },
    select: {
      id: true,
      documentType: true,
      documentVersion: true,
      consentedAt: true,
    },
  });

  if (existingConsent) {
    return reply.send({
      success: true,
      alreadyAccepted: true,
      consentId: existingConsent.id,
      documentType: existingConsent.documentType,
      documentVersion: existingConsent.documentVersion,
      consentedAt: existingConsent.consentedAt,
    });
  }

  const consent = await prisma.userConsent.create({
    data: {
      userId: dbUser.id,
      documentType,
      documentVersion,
      documentTextHash,
      acceptedItems,
      source,
      emailAtMoment: dbUser.email,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      clientId: getClientId(req),
      requestId: req.id,
      emailStatus: 'PENDING',
    },
    select: {
      id: true,
      documentType: true,
      documentVersion: true,
      consentedAt: true,
    },
  });

  try {
    await sendEmail({
      to: dbUser.email,
      subject: buildTransborderConsentEmailSubject(),
      html: buildTransborderConsentEmailHtml({
        fullName: dbUser.fullName,
      }),
    });

    await prisma.userConsent.update({
      where: { id: consent.id },
      data: {
        emailStatus: 'SENT',
        emailSentAt: new Date(),
        emailError: null,
      },
    });
  } catch (error) {
    console.error('[TRANSBORDER CONSENT EMAIL ERROR]', error);

    await prisma.userConsent.update({
      where: { id: consent.id },
      data: {
        emailStatus: 'FAILED',
        emailError: error instanceof Error ? error.message : 'Не удалось отправить письмо',
      },
    });
  }

  return reply.code(201).send({
    success: true,
    alreadyAccepted: false,
    consentId: consent.id,
    documentType: consent.documentType,
    documentVersion: consent.documentVersion,
    consentedAt: consent.consentedAt,
  });
}
