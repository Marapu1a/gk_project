import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
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

async function deletePhysicalAvatar(fileId: string) {
  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  try {
    await fs.unlink(path.join(baseDir, fileId));
  } catch {
    // файл мог быть уже удален вручную или старой очисткой
  }
}

interface SetAvatarUrlRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: { avatarUrl: string | null };
  Reply: { id: string; avatarUrl: string | null };
}

export async function setAvatarUrlHandler(
  req: FastifyRequest<SetAvatarUrlRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user; // как в твоём примере
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { id } = req.params;
  const { avatarUrl } = req.body || {};

  if (actor.role !== 'ADMIN' && actor.userId !== id) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (avatarUrl !== null && typeof avatarUrl !== 'string') {
    return reply.code(400).send({ error: 'avatarUrl должен быть строкой или null' });
  }

  const normalizedAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : avatarUrl;

  if (normalizedAvatarUrl) {
    if (!normalizedAvatarUrl.startsWith(UPLOADS_PREFIX)) {
      return reply.code(422).send({ error: 'Некорректная ссылка на аватар' });
    }

    const fileId = avatarFileIdFromUrl(normalizedAvatarUrl);
    if (!fileId || !fileId.includes('/avatar/')) {
      return reply.code(422).send({ error: 'Некорректный файл аватара' });
    }

    const file = await prisma.uploadedFile.findUnique({
      where: { fileId },
      select: { id: true, userId: true },
    });

    if (!file) {
      return reply.code(404).send({ error: 'Файл аватара не найден' });
    }

    if (file.userId !== id) {
      return reply.code(403).send({ error: 'Файл аватара принадлежит другому пользователю' });
    }
  }

  let fileIdToDelete: string | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    if (!normalizedAvatarUrl) {
      const currentUser = await tx.user.findUnique({
        where: { id },
        select: { avatarUrl: true },
      });

      const currentFileId = avatarFileIdFromUrl(currentUser?.avatarUrl);
      const currentAvatarFile = currentFileId
        ? await tx.uploadedFile.findUnique({
          where: { fileId: currentFileId },
          select: { id: true, userId: true, fileId: true },
        })
        : null;

      if (currentAvatarFile?.userId === id && currentAvatarFile.fileId.includes('/avatar/')) {
        await tx.uploadedFile.delete({ where: { id: currentAvatarFile.id } });
        fileIdToDelete = currentAvatarFile.fileId;
      }
    }

    return tx.user.update({
      where: { id },
      data: { avatarUrl: normalizedAvatarUrl || null },
      select: { id: true, avatarUrl: true },
    });
  });

  if (fileIdToDelete) {
    await deletePhysicalAvatar(fileIdToDelete);
  }

  return reply.send(updated);
}
