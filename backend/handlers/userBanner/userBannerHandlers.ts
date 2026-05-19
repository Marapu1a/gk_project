import { FastifyReply, FastifyRequest } from 'fastify';
import { UserBannerTone } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const BANNER_ID = 'global';
const tones = new Set<string>(['DANGER', 'DARK', 'SOFT']);

type UpdateUserBannerBody = {
  enabled?: boolean;
  tone?: UserBannerTone;
  message?: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  dismissible?: boolean;
};

function normalizeOptional(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function isAllowedUrl(value: string | null) {
  if (!value) return true;
  return value.startsWith('/') || value.startsWith('https://') || value.startsWith('http://');
}

function publicBannerDto(banner: Awaited<ReturnType<typeof getBannerRecord>>) {
  if (!banner) return null;
  return {
    id: banner.id,
    enabled: banner.enabled,
    tone: banner.tone,
    message: banner.message,
    ctaLabel: banner.ctaLabel,
    ctaUrl: banner.ctaUrl,
    dismissible: banner.dismissible,
    updatedAt: banner.updatedAt,
  };
}

async function getBannerRecord() {
  return prisma.userBanner.findUnique({ where: { id: BANNER_ID } });
}

export async function getActiveUserBannerHandler(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const banner = await getBannerRecord();

  if (!banner?.enabled || !banner.message.trim()) {
    return reply.send(null);
  }

  return reply.send(publicBannerDto(banner));
}

export async function getAdminUserBannerHandler(req: FastifyRequest, reply: FastifyReply) {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const banner = await prisma.userBanner.upsert({
    where: { id: BANNER_ID },
    update: {},
    create: { id: BANNER_ID },
  });

  return reply.send(publicBannerDto(banner));
}

export async function updateAdminUserBannerHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const body = (req.body ?? {}) as UpdateUserBannerBody;
  const enabled = Boolean(body.enabled);
  const tone = tones.has(String(body.tone)) ? body.tone! : UserBannerTone.DARK;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  const ctaLabel = normalizeOptional(body.ctaLabel, 80);
  const ctaUrl = normalizeOptional(body.ctaUrl, 500);
  const dismissible = body.dismissible !== false;

  if (enabled && !message) {
    return reply.code(400).send({ error: 'Введите текст баннера' });
  }

  if (!isAllowedUrl(ctaUrl)) {
    return reply.code(400).send({ error: 'Ссылка должна начинаться с http://, https:// или /' });
  }

  if (ctaUrl && !ctaLabel) {
    return reply.code(400).send({ error: 'Для кнопки укажите текст' });
  }

  const banner = await prisma.userBanner.upsert({
    where: { id: BANNER_ID },
    update: {
      enabled,
      tone,
      message,
      ctaLabel,
      ctaUrl,
      dismissible,
      updatedById: req.user.userId,
    },
    create: {
      id: BANNER_ID,
      enabled,
      tone,
      message,
      ctaLabel,
      ctaUrl,
      dismissible,
      updatedById: req.user.userId,
    },
  });

  return reply.send(publicBannerDto(banner));
}
