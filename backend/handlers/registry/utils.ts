// handlers/registry/utils.ts
import { prisma } from '../../lib/prisma';

/**
 * Активный = expiresAt >= now()
 * Возвращает последний по issuedAt активный сертификат или null.
 */
export async function getActiveCertificate(userId: string) {
  if (!userId) return null;
  const now = new Date();

  const cert = await prisma.certificate.findFirst({
    where: { userId, expiresAt: { gte: now } },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      title: true,
      number: true,
      issuedAt: true,
      expiresAt: true,
      file: { select: { fileId: true } }, // ← тянем правильный идентификатор файла
    },
  });

  if (!cert) return null;
  return {
    id: cert.id,
    title: cert.title,
    number: cert.number,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    fileId: cert.file.fileId, // ← это то, что нужно для /uploads/:fileId
  };
}

export async function getRegistryList({
  country,
  city,
  page = 1,
  limit = 20,
}: {
  country?: string;
  city?: string;
  page?: number;
  limit?: number;
}) {
  const now = new Date();
  const skip = (page - 1) * limit;

  const users = await prisma.user.findMany({
    where: {
      country: country || undefined,
      city: city || undefined,
      certificates: {
        some: {
          expiresAt: { gte: now },
        },
      },
    },
    orderBy: { fullName: 'asc' },
    skip,
    take: limit,
    select: {
      id: true,
      fullName: true,
      country: true,
      city: true,
      avatarUrl: true,
    },
  });

  const total = await prisma.user.count({
    where: {
      country: country || undefined,
      city: city || undefined,
      certificates: {
        some: {
          expiresAt: { gte: now },
        },
      },
    },
  });

  return {
    items: users,
    total,
    page,
    limit,
  };
}

export async function getRegistryProfile(userId: string) {
  if (!userId) return null;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, fullName: true, country: true, city: true, avatarUrl: true, createdAt: true, bio: true,
      certificates: {
        where: { expiresAt: { gte: now } },
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          title: true,
          number: true,
          issuedAt: true,
          expiresAt: true,
          file: { select: { fileId: true } }, // ← берём UploadedFile.fileId
        },
      },
    },
  });

  if (!user || user.certificates.length === 0) return null;

  const c = user.certificates[0];
  return {
    id: user.id,
    fullName: user.fullName,
    country: user.country,
    city: user.city,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    bio: user.bio,
    certificate: {
      id: c.id,
      title: c.title,
      number: c.number,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      fileId: c.file.fileId, // ← правильный id для фронта
    },
  };
}
