// handlers/registry/utils.ts
import { prisma } from '../../lib/prisma';

/** Активный = expiresAt >= now(). Последний по issuedAt активный сертификат или null. */
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
      file: { select: { fileId: true } },
    },
  });

  if (!cert) return null;
  return {
    id: cert.id,
    title: cert.title,
    number: cert.number,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    fileId: cert.file.fileId,
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
      certificates: { some: { expiresAt: { gte: now } } },
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
      // тянем группы, чтобы вычислить активную
      groups: { include: { group: { select: { name: true, rank: true } } } },
    },
  });

  const items = users.map(u => {
    const top = u.groups.map(g => g.group).sort((a, b) => b.rank - a.rank)[0];
    return {
      id: u.id,
      fullName: u.fullName,
      country: u.country,
      city: u.city,
      avatarUrl: u.avatarUrl,
      groupName: top?.name ?? null, // ← статус
    };
  });

  const total = await prisma.user.count({
    where: {
      country: country || undefined,
      city: city || undefined,
      certificates: { some: { expiresAt: { gte: now } } },
    },
  });

  return { items, total, page, limit };
}

export async function getRegistryProfile(userId: string) {
  if (!userId) return null;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      country: true,
      city: true,
      avatarUrl: true,
      createdAt: true,
      bio: true,
      // активная группа
      groups: { include: { group: { select: { name: true, rank: true } } } },
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
          file: { select: { fileId: true } },
        },
      },
    },
  });

  if (!user || user.certificates.length === 0) return null;

  const top = user.groups.map(g => g.group).sort((a, b) => b.rank - a.rank)[0];
  const c = user.certificates[0];

  return {
    id: user.id,
    fullName: user.fullName,
    country: user.country,
    city: user.city,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    bio: user.bio,
    groupName: top?.name ?? null, // ← статус
    certificate: {
      id: c.id,
      title: c.title,
      number: c.number,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      fileId: c.file.fileId,
    },
  };
}
