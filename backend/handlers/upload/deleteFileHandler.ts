import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';

import { UPLOAD_ROOT } from '../../config/storage';

export async function deleteFileHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const file = await prisma.uploadedFile.findUnique({
    where: { id },
    include: {
      certificate: { select: { id: true } },
      supervisionContract: { select: { id: true } },
      documentReviewFiles: { select: { id: true }, take: 1 },
    },
  });

  if (!file) {
    return reply.code(404).send({ error: 'Файл не найден' });
  }

  // доступ: владелец или админ
  if (file.userId !== user.userId && user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа к этому файлу' });
  }

  // CEU хранит строковый fileId, остальные сущности ссылаются на UploadedFile.id.
  const usedInCeu = await prisma.cEURecord.findFirst({
    where: { fileId: file.fileId },
    select: { id: true },
  });

  const isInUse =
    Boolean(usedInCeu) ||
    Boolean(file.requestId) ||
    Boolean(file.certificate) ||
    Boolean(file.supervisionContract) ||
    file.documentReviewFiles.length > 0;

  if (isInUse) {
    return reply
      .code(409)
      .send({ error: 'Файл уже прикреплён к заявке и не может быть удалён' });
  }

  const avatarUrl = `/uploads/${file.fileId}`;

  await prisma.$transaction(async (tx) => {
    // если удаляемый файл сейчас стоит аватаркой у пользователя — обнуляем avatarUrl
    await tx.user.updateMany({
      where: {
        id: file.userId,
        avatarUrl,
      },
      data: {
        avatarUrl: null,
      },
    });

    // удаляем запись о файле из БД всегда
    await tx.uploadedFile.delete({
      where: { id: file.id },
    });
  });

  const baseDir = UPLOAD_ROOT;

  const filePath = path.join(baseDir, file.fileId);

  try {
    await fs.unlink(filePath);
  } catch {
    // файл уже мог отсутствовать — это не критично
  }

  return reply.send({ success: true });
}
