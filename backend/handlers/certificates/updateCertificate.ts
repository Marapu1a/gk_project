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

function getChainGroupNames(
  groupName: string
): Array<'Инструктор' | 'Куратор' | 'Супервизор' | 'Опытный Супервизор'> {
  if (groupName === 'Супервизор' || groupName === 'Опытный Супервизор') {
    return ['Супервизор', 'Опытный Супервизор'];
  }

  if (groupName === 'Инструктор') return ['Инструктор'];
  if (groupName === 'Куратор') return ['Куратор'];

  return [];
}

export async function updateCertificateHandler(
  req: FastifyRequest<UpdateCertificateRoute>,
  reply: FastifyReply
) {
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

  const nextTitle = typeof title === 'string' ? title.trim() : existing.title;
  const nextNumber = typeof number === 'string' ? number.trim() : existing.number;

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

      fileToUse = file;
      newFileId = file.id;
      if (existing.file) {
        oldFileToDelete = { id: existing.file.id, fileId: existing.file.fileId };
      }
    }
  }

  const chainGroupNames = getChainGroupNames(existing.group.name);
  if (!chainGroupNames.length) {
    return reply.code(500).send({ error: 'CERTIFICATE_CHAIN_GROUPS_NOT_CONFIGURED' });
  }

  const chainGroups = await prisma.group.findMany({
    where: { name: { in: chainGroupNames } },
    select: { id: true, name: true },
  });

  const chainGroupIds = chainGroups.map((g) => g.id);
  if (!chainGroupIds.length) {
    return reply.code(500).send({ error: 'CERTIFICATE_CHAIN_GROUPS_NOT_CONFIGURED' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (fileToUse && (fileToUse.userId !== existing.userId || fileToUse.type !== 'CERTIFICATE')) {
        await tx.uploadedFile.update({
          where: { id: fileToUse.id },
          data: {
            userId: existing.userId,
            type: 'CERTIFICATE',
          },
        });
      }

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

      const all = await tx.certificate.findMany({
        where: {
          userId: existing.userId,
          groupId: { in: chainGroupIds },
        },
        orderBy: { issuedAt: 'asc' },
        select: { id: true, groupId: true },
      });

      for (let i = 0; i < all.length; i++) {
        const prevId = i === 0 ? null : all[i - 1].id;
        const currentGroupId = all[i].groupId;
        const currentGroupName = chainGroups.find((g) => g.id === currentGroupId)?.name ?? null;

        await tx.certificate.update({
          where: { id: all[i].id },
          data: {
            previousId: prevId,
            isRenewal: currentGroupName === 'Опытный Супервизор',
          },
        });
      }

      if (oldFileToDelete) {
        await tx.uploadedFile.delete({ where: { id: oldFileToDelete.id } });
      }

      return cert;
    });

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
