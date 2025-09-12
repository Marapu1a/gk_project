// src/handlers/users/deleteUser.ts
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

interface DeleteUserRoute extends RouteGenericInterface {
  Params: { id: string };
}

const UPLOAD_DIR = process.env.UPLOAD_DIR;

export async function deleteUserHandler(
  req: FastifyRequest<DeleteUserRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });
  const me = await prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true } });
  if (me?.role !== 'ADMIN') return reply.code(403).send({ error: 'Нет доступа' });

  const { id: userId } = req.params || {};
  if (!userId) return reply.code(400).send({ error: 'id обязателен' });
  if (userId === actor.userId) return reply.code(400).send({ error: 'Нельзя удалить самого себя' });

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return reply.code(404).send({ error: 'Пользователь не найден' });

  let filesToUnlink: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      // 0) Отвязать в чужих данных
      await tx.certificate.updateMany({ where: { confirmedById: userId }, data: { confirmedById: null } });
      await tx.cEUEntry.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null, reviewedAt: null } });
      await tx.supervisionHour.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null, reviewedAt: null } });

      // 1) CEU
      const ceuRecs = await tx.cEURecord.findMany({ where: { userId }, select: { id: true } });
      if (ceuRecs.length) {
        const ids = ceuRecs.map(r => r.id);
        await tx.cEUEntry.deleteMany({ where: { recordId: { in: ids } } });
        await tx.cEURecord.deleteMany({ where: { id: { in: ids } } });
      }

      // 2) Supervision
      const supRecs = await tx.supervisionRecord.findMany({ where: { userId }, select: { id: true } });
      if (supRecs.length) {
        const ids = supRecs.map(r => r.id);
        await tx.supervisionHour.deleteMany({ where: { recordId: { in: ids } } });
        await tx.supervisionRecord.deleteMany({ where: { id: { in: ids } } });
      }

      // 3) Сертификаты пользователя
      await tx.certificate.updateMany({ where: { userId }, data: { previousId: null } });
      await tx.certificate.deleteMany({ where: { userId } });

      // 4) Файлы пользователя (собираем относительные пути и удаляем записи)
      const userFiles = await tx.uploadedFile.findMany({
        where: { userId },
        select: { fileId: true },
      });
      filesToUnlink = userFiles.map(f => f.fileId);
      if (userFiles.length) {
        await tx.uploadedFile.deleteMany({ where: { userId } });
      }

      // 5) Прочее навесное
      await tx.notification.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.examApplication.deleteMany({ where: { userId } }); // onDelete: Cascade есть, но так надёжнее явно
      await tx.userGroup.deleteMany({ where: { userId } });
      await tx.documentReviewRequest.deleteMany({ where: { userId } });

      // 6) Сам пользователь
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (e: any) {
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }

  // 7) Физически удалить файлы
  if (filesToUnlink.length) {
    const baseDir = UPLOAD_DIR
      ? path.resolve(UPLOAD_DIR)
      : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

    await Promise.all(
      filesToUnlink.map(async (rel) => {
        try { await fs.unlink(path.join(baseDir, rel)); } catch { /* уже нет — и ладно */ }
      })
    );
  }

  return reply.code(204).send();
}
