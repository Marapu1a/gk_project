// src/handlers/certificates/updateCertificate.ts
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

interface UpdateCertificateRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    title?: string;
    number?: string;
    issuedAt?: string;       // ISO
    expiresAt?: string;      // ISO
    uploadedFileId?: string; // UploadedFile.id
  };
}

const UPLOAD_DIR = process.env.UPLOAD_DIR;

export async function updateCertificateHandler(
  req: FastifyRequest<UpdateCertificateRoute>,
  reply: FastifyReply
) {
  // только админ
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const me = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { role: true },
  });
  if (me?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const { id } = req.params || {};
  if (!id) return reply.code(400).send({ error: 'id обязателен' });

  const { title, number, issuedAt, expiresAt, uploadedFileId } = req.body || {};

  if (
    typeof title === 'undefined' &&
    typeof number === 'undefined' &&
    typeof issuedAt === 'undefined' &&
    typeof expiresAt === 'undefined' &&
    typeof uploadedFileId === 'undefined'
  ) {
    return reply.code(400).send({
      error: 'Нужно передать хотя бы одно поле для обновления',
    });
  }

  // текущий сертификат
  const existing = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user: true,
      group: true,
      file: true,
      confirmedBy: true,
    },
  });

  if (!existing) {
    return reply.code(404).send({ error: 'Сертификат не найден' });
  }

  // 1) Нормализация строк
  const nextTitle = typeof title === 'string' ? title.trim() : existing.title;
  const nextNumber = typeof number === 'string' ? number.trim() : existing.number;

  // 2) Даты
  let nextIssuedAt = existing.issuedAt;
  let nextExpiresAt = existing.expiresAt;

  if (typeof issuedAt === 'string') {
    const iss = new Date(issuedAt);
    if (Number.isNaN(iss.getTime())) {
      return reply.code(422).send({ error: 'issuedAt должен быть корректной ISO-датой' });
    }
    nextIssuedAt = iss;
  }

  if (typeof expiresAt === 'string') {
    const exp = new Date(expiresAt);
    if (Number.isNaN(exp.getTime())) {
      return reply.code(422).send({ error: 'expiresAt должен быть корректной ISO-датой' });
    }
    nextExpiresAt = exp;
  }

  const now = new Date();

  if (nextIssuedAt > now) {
    return reply.code(422).send({ error: 'issuedAt не может быть в будущем' });
  }

  if (nextExpiresAt <= nextIssuedAt) {
    return reply.code(422).send({ error: 'expiresAt должен быть позже issuedAt' });
  }

  // 3) Файл: выясняем, меняем ли мы файл и что за старый
  let fileToUse = existing.file;
  let newFileId = existing.fileId;
  let oldFileToDelete: { id: string; fileId: string | null } | null = null;

  if (typeof uploadedFileId === 'string') {
    const trimmed = uploadedFileId.trim();
    if (trimmed !== existing.fileId) {
      const file = await prisma.uploadedFile.findUnique({
        where: { id: trimmed },
      });
      if (!file) {
        return reply.code(404).send({ error: 'Файл не найден' });
      }

      // проверка уникальности файла
      const existingByFile = await prisma.certificate.findFirst({
        where: {
          fileId: file.id,
          id: { not: existing.id },
        },
      });
      if (existingByFile) {
        return reply
          .code(409)
          .send({ error: 'Этот файл уже используется другим сертификатом' });
      }

      // будем использовать этот файл, а старый — удалить
      fileToUse = file;
      newFileId = file.id;
      if (existing.file) {
        oldFileToDelete = { id: existing.file.id, fileId: existing.file.fileId };
      }
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // если сменили файл — идемпотентно привязываем его к пользователю и типу CERTIFICATE
      if (fileToUse && (fileToUse.userId !== existing.userId || fileToUse.type !== 'CERTIFICATE')) {
        await tx.uploadedFile.update({
          where: { id: fileToUse.id },
          data: {
            userId: existing.userId,
            type: 'CERTIFICATE',
          },
        });
      }

      // обновляем сам сертификат
      const cert = await tx.certificate.update({
        where: { id: existing.id },
        data: {
          title: nextTitle,
          number: nextNumber,
          issuedAt: nextIssuedAt,
          expiresAt: nextExpiresAt,
          fileId: newFileId,
        },
        include: {
          group: true,
          file: true,
          confirmedBy: true,
        },
      });

      // пересобираем цепочку previousId/isRenewal для данного user+group
      const all = await tx.certificate.findMany({
        where: { userId: existing.userId, groupId: existing.groupId },
        orderBy: { issuedAt: 'asc' },
        select: { id: true },
      });

      for (let i = 0; i < all.length; i++) {
        const prevId = i === 0 ? null : all[i - 1].id;
        await tx.certificate.update({
          where: { id: all[i].id },
          data: {
            previousId: prevId,
            isRenewal: i > 0,
          },
        });
      }

      // удаляем старую запись файла, если нужно
      if (oldFileToDelete) {
        await tx.uploadedFile.delete({ where: { id: oldFileToDelete.id } });
      }

      return cert;
    });

    // после успешной транзакции — удаляем физический файл, если был
    if (oldFileToDelete?.fileId) {
      const baseDir = UPLOAD_DIR
        ? path.resolve(UPLOAD_DIR)
        : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');
      const filePath = path.join(baseDir, oldFileToDelete.fileId);

      try {
        await fs.unlink(filePath);
      } catch {
        // если файл уже удалён — забиваем
      }
    }

    return reply.send({
      id: updated.id,
      title: updated.title,
      number: updated.number,
      issuedAt: updated.issuedAt,
      expiresAt: updated.expiresAt,
      isRenewal: updated.isRenewal,
      previousId: updated.previousId,
      group: {
        id: updated.group.id,
        name: updated.group.name,
        rank: updated.group.rank,
      },
      file: {
        id: updated.file.id,
        name: updated.file.name,
        fileId: updated.file.fileId,
      },
      confirmedBy: updated.confirmedBy
        ? {
          id: (updated.confirmedBy as any).id,
          email: (updated.confirmedBy as any).email,
          fullName: (updated.confirmedBy as any).fullName,
        }
        : null,
      isActiveNow: now <= updated.expiresAt,
      isExpired: now > updated.expiresAt,
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return reply.code(409).send({
        error: 'duplicate_certificate',
        detail: 'Нарушено уникальное ограничение (fileId или previousId)',
      });
    }
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
