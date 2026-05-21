import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';

const UPLOADS_PREFIX = '/uploads/';
const UPLOAD_DIR = process.env.UPLOAD_DIR;

function avatarFileIdFromUrl(avatarUrl: string | null | undefined): string | null {
  if (typeof avatarUrl !== 'string') return null;

  const value = avatarUrl.trim();
  if (!value.startsWith(UPLOADS_PREFIX)) return null;

  const fileId = value.slice(UPLOADS_PREFIX.length).trim();
  return fileId || null;
}

function safeAvatarUrl(avatarUrl: string | null | undefined, existingAvatarFileIds: Set<string>) {
  const fileId = avatarFileIdFromUrl(avatarUrl);
  return fileId && existingAvatarFileIds.has(fileId) ? avatarUrl : null;
}

function uploadsBaseDir() {
  return UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');
}

async function physicalFileExists(fileId: string) {
  try {
    await fs.access(path.join(uploadsBaseDir(), fileId));
    return true;
  } catch {
    return false;
  }
}

async function existingAvatarFileIdsFromDbAndDisk(fileIds: string[]) {
  if (!fileIds.length) return new Set<string>();

  const files = await prisma.uploadedFile.findMany({
    where: { fileId: { in: fileIds } },
    select: { fileId: true },
  });

  const existingPairs = await Promise.all(
    files.map(async (file) => ({
      fileId: file.fileId,
      exists: await physicalFileExists(file.fileId),
    })),
  );

  return new Set(existingPairs.filter((file) => file.exists).map((file) => file.fileId));
}

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
  const skip = (page - 1) * limit;

  // базовый фильтр: админы в публичный реестр не попадают
  const where: any = {
    role: { not: 'ADMIN' },
    isProfileVisible: true,
    archivedAt: null,
  };
  if (country) where.country = country;
  if (city) where.city = city;

  const now = new Date();

  const users = await prisma.user.findMany({
    where,
    // сначала новые по createdAt, потом по имени для стабильности
    orderBy: [{ createdAt: 'desc' }, { fullName: 'asc' }],
    skip,
    take: limit,
    select: {
      id: true,
      createdAt: true,
      fullName: true,
      fullNameLatin: true,
      country: true,
      city: true,
      avatarUrl: true,
      bio: true,
      // тянем группы, чтобы вычислить активную
      groups: { include: { group: { select: { name: true, rank: true } } } },
      // тянем только активный сертификат (если есть), чтобы посчитать isCertified
      certificates: {
        where: { expiresAt: { gte: now } },
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  const avatarFileIds = Array.from(
    new Set(users.map((u) => avatarFileIdFromUrl(u.avatarUrl)).filter(Boolean) as string[]),
  );

  const existingAvatarFileIds = await existingAvatarFileIdsFromDbAndDisk(avatarFileIds);

  const items = users.map((u) => {
    const top = u.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank)[0];
    const activeCert = u.certificates[0] || null;

    return {
      id: u.id,
      createdAt: u.createdAt,
      fullName: u.fullName,
      fullNameLatin: u.fullNameLatin,
      country: u.country,
      city: u.city,
      avatarUrl: safeAvatarUrl(u.avatarUrl, existingAvatarFileIds),
      bio: u.bio,
      groupName: top?.name ?? null,
      groupRank: top?.rank ?? null,
      isCertified: !!activeCert,
    };
  });

  const total = await prisma.user.count({ where });

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
      fullNameLatin: true,
      country: true,
      city: true,
      avatarUrl: true,
      createdAt: true,
      bio: true,
      archivedAt: true,
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

  if (!user) return null;
  if ((user as any).archivedAt) return null;

  const avatarFileId = avatarFileIdFromUrl(user.avatarUrl);
  const existingAvatarFileIds = await existingAvatarFileIdsFromDbAndDisk(
    avatarFileId ? [avatarFileId] : [],
  );

  const top = user.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank)[0];
  const c = user.certificates[0] || null;

  return {
    id: user.id,
    fullName: user.fullName,
    fullNameLatin: user.fullNameLatin,
    country: user.country,
    city: user.city,
    avatarUrl: safeAvatarUrl(user.avatarUrl, existingAvatarFileIds),
    createdAt: user.createdAt,
    bio: user.bio,
    groupName: top?.name ?? null,
    certificate: c
      ? {
        id: c.id,
        title: c.title,
        number: c.number,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        fileId: c.file.fileId,
      }
      : null,
  };
}
