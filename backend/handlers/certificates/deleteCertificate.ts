// src/handlers/certificates/deleteCertificate.ts
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

interface DeleteCertificateRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: { deleteFile?: boolean };
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

export async function deleteCertificateHandler(
  req: FastifyRequest<DeleteCertificateRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const me = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { role: true },
  });
  if (me?.role !== 'ADMIN') return reply.code(403).send({ error: 'Нет доступа' });

  const { id } = req.params || {};
  if (!id) return reply.code(400).send({ error: 'id обязателен' });

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      file: { select: { id: true, fileId: true } },
      group: { select: { name: true, id: true } },
      user: { select: { id: true } },
    },
  });

  if (!cert) return reply.code(404).send({ error: 'Сертификат не найден' });

  const deleteFile = req.body?.deleteFile !== false;
  const fileRecord = cert.file ?? null;

  const chainGroupNames = getChainGroupNames(cert.group.name);
  if (!chainGroupNames.length) {
    return reply.code(500).send({ error: 'CERTIFICATE_CHAIN_GROUPS_NOT_CONFIGURED' });
  }

  const chainGroups = await prisma.group.findMany({
    where: { name: { in: chainGroupNames } },
    select: { id: true, name: true },
  });

  const chainGroupIds = chainGroups.map((g) => g.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. удаляем сертификат
      await tx.certificate.delete({ where: { id: cert.id } });

      // 2. пересобираем цепочку
      const all = await tx.certificate.findMany({
        where: {
          userId: cert.user.id,
          groupId: { in: chainGroupIds },
        },
        orderBy: { issuedAt: 'asc' },
        select: { id: true, groupId: true },
      });

      for (let i = 0; i < all.length; i++) {
        const prevId = i === 0 ? null : all[i - 1].id;

        const currentGroupName =
          chainGroups.find((g) => g.id === all[i].groupId)?.name ?? null;

        await tx.certificate.update({
          where: { id: all[i].id },
          data: {
            previousId: prevId,
            isRenewal: currentGroupName === 'Опытный Супервизор',
          },
        });
      }

      // 3. удаляем запись файла
      if (deleteFile && fileRecord) {
        await tx.uploadedFile.delete({ where: { id: fileRecord.id } });
      }
    });
  } catch (e: any) {
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }

  if (deleteFile && fileRecord?.fileId) {
    const baseDir = UPLOAD_DIR
      ? path.resolve(UPLOAD_DIR)
      : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

    const filePath = path.join(baseDir, fileRecord.fileId);
    try {
      await fs.unlink(filePath);
    } catch { }
  }

  return reply.code(204).send();
}
