// src/handlers/auth/acceptTransborderConsentHandler.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
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

const EMAIL_RETRY_ATTEMPTS = 3;
const EMAIL_RETRY_DELAY_MS = 800;

const LEGACY_CONSENT_KEY_ALIASES: Partial<Record<string, ConsentItemCode>> = {
  PRIVACY_POLICY_ACK: 'PD_PROCESSING_ACCEPTED',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  req?: FastifyRequest,
): Record<ConsentItemCode, boolean> {
  const requiredCodes = getRequiredConsentItemCodes();
  const validCodes = new Set<ConsentItemCode>(
    TRANSBORDER_CONSENT_DOCUMENT.items.map((item) => item.code),
  );

  if (!acceptedItems || typeof acceptedItems !== 'object' || Array.isArray(acceptedItems)) {
    throw new Error('Не переданы подтвержденные пункты согласия');
  }

  const remappedAcceptedItems: Partial<Record<ConsentItemCode, boolean>> = {};

  for (const [rawKey, rawValue] of Object.entries(acceptedItems)) {
    const normalizedKey = LEGACY_CONSENT_KEY_ALIASES[rawKey] ?? rawKey;

    if (!validCodes.has(normalizedKey as ConsentItemCode)) {
      req?.log.warn(
        {
          rawKey,
          normalizedKey,
        },
        '[TRANSBORDER CONSENT] Unknown consent key ignored',
      );
      continue;
    }

    remappedAcceptedItems[normalizedKey as ConsentItemCode] = rawValue === true;
  }

  for (const code of requiredCodes) {
    if (remappedAcceptedItems[code] !== true) {
      throw new Error('Не все обязательные пункты согласия подтверждены');
    }
  }

  const normalized = {} as Record<ConsentItemCode, boolean>;

  for (const item of TRANSBORDER_CONSENT_DOCUMENT.items) {
    normalized[item.code] = remappedAcceptedItems[item.code] === true;
  }

  return normalized;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function sendConsentEmailWithRetry(params: {
  to: string;
  fullName: string;
}): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await sendEmail({
        to: params.to,
        subject: buildTransborderConsentEmailSubject(),
        html: buildTransborderConsentEmailHtml({
          fullName: params.fullName,
        }),
      });

      return;
    } catch (error) {
      lastError = error;

      if (attempt < EMAIL_RETRY_ATTEMPTS) {
        await sleep(EMAIL_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
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
    acceptedItems = normalizeAcceptedItems(body.acceptedItems, req);
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

  let consent: {
    id: string;
    documentType: typeof documentType;
    documentVersion: string;
    documentTextHash: string;
    consentedAt: Date;
  };
  let alreadyAccepted = false;

  try {
    consent = await prisma.userConsent.create({
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
        documentTextHash: true,
        consentedAt: true,
      },
    });
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }

    const existingConsent = await prisma.userConsent.findUnique({
      where: {
        userId_documentType_documentVersion: {
          userId: dbUser.id,
          documentType,
          documentVersion,
        },
      },
      select: {
        id: true,
        documentType: true,
        documentVersion: true,
        documentTextHash: true,
        consentedAt: true,
      },
    });

    if (!existingConsent) {
      req.log.error(
        {
          userId: dbUser.id,
          documentType,
          documentVersion,
          requestId: req.id,
          error,
        },
        '[TRANSBORDER CONSENT] Unique conflict happened, but existing consent was not found',
      );
      throw error;
    }

    consent = existingConsent;
    alreadyAccepted = true;
  }

  if (alreadyAccepted) {
    if (consent.documentTextHash !== documentTextHash) {
      req.log.error(
        {
          userId: dbUser.id,
          consentId: consent.id,
          documentType,
          documentVersion,
          storedHash: consent.documentTextHash,
          actualHash: documentTextHash,
        },
        '[TRANSBORDER CONSENT] Existing consent hash does not match current document hash',
      );
    }

    return reply.send({
      success: true,
      alreadyAccepted: true,
      consentId: consent.id,
      documentType: consent.documentType,
      documentVersion: consent.documentVersion,
      consentedAt: consent.consentedAt,
    });
  }

  try {
    await sendConsentEmailWithRetry({
      to: dbUser.email,
      fullName: dbUser.fullName,
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
    req.log.error(
      {
        userId: dbUser.id,
        consentId: consent.id,
        error,
      },
      '[TRANSBORDER CONSENT EMAIL ERROR]',
    );

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
