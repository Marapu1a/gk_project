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

  // Защита от пустого списка файлов
  if (!fileIds || fileIds.length === 0) {
    return reply.code(400).send({ error: 'Не выбраны файлы для проверки' });
  }

  // 1) Проверяем, нет ли активной заявки на рассмотрении
  const existingUnconfirmed = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId, status: 'UNCONFIRMED' },
  });

  if (existingUnconfirmed) {
    return reply.code(400).send({ error: 'У вас уже есть активная заявка' });
  }

  // 2) Ищем последнюю подтверждённую заявку (её будем дополнять при необходимости)
  const existingConfirmed = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId, status: 'CONFIRMED' },
    orderBy: { submittedAt: 'desc' },
  });

  // 3) Проверка файлов (общая часть)
  const files = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      userId: user.userId,
    },
  });

  if (files.length !== fileIds.length) {
    return reply
      .code(400)
      .send({ error: 'Некоторые файлы не найдены или вам не принадлежат' });
  }

  if (files.some((f) => f.type === null)) {
    return reply
      .code(400)
      .send({ error: 'У всех файлов должен быть выбран тип документа' });
  }

  const trimmedComment = comment?.trim() || null;

  // 4) Если есть подтверждённая заявка — дополняем её и возвращаем в статус UNCONFIRMED
  if (existingConfirmed) {
    const updatedReq = await prisma.$transaction(async (tx) => {
      // привязываем новые файлы к существующей заявке
      await tx.uploadedFile.updateMany({
        where: { id: { in: fileIds }, userId: user.userId },
        data: { requestId: existingConfirmed.id },
      });

      // сбрасываем статус и метаданные ревью
      return tx.documentReviewRequest.update({
        where: { id: existingConfirmed.id },
        data: {
          status: 'UNCONFIRMED',
          comment: trimmedComment,
          reviewedAt: null,
          reviewerEmail: null,
        },
      });
    });

    return reply.code(200).send(updatedReq);
  }

  // 5) Иначе создаём НОВУЮ заявку (случай "первый раз" или после REJECTED)
  const reqNew = await prisma.documentReviewRequest.create({
    data: {
      userId: user.userId,
      comment: trimmedComment,
    },
  });

  await prisma.uploadedFile.updateMany({
    where: { id: { in: fileIds }, userId: user.userId },
    data: { requestId: reqNew.id },
  });

  return reply.code(201).send(reqNew);
}
