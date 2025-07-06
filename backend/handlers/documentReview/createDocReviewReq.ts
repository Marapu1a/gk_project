import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function createDocReviewReq(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const { fileIds, comment } = req.body as {
    fileIds: string[];
    comment?: string;
  };

  // Проверка на активную заявку
  const existing = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId, status: 'UNCONFIRMED' },
  });

  if (existing) {
    return reply.code(400).send({ error: 'У вас уже есть активная заявка' });
  }

  // Проверка файлов
  const files = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      userId: user.userId,
    },
  });

  if (files.length !== fileIds.length) {
    return reply.code(400).send({ error: 'Некоторые файлы не найдены или вам не принадлежат' });
  }

  // Создание заявки
  const reqNew = await prisma.documentReviewRequest.create({
    data: {
      userId: user.userId,
      comment: comment?.trim() || null,
    },
  });

  // Привязка файлов
  await prisma.uploadedFile.updateMany({
    where: { id: { in: fileIds } },
    data: { requestId: reqNew.id },
  });

  return reply.code(201).send(reqNew);
}
