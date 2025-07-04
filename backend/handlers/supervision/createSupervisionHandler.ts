import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import { RecordStatus } from '@prisma/client';

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;
  const parsed = createSupervisionSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { fileId, entries, supervisorEmail } = parsed.data;

  const reviewer = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    include: {
      groups: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!currentUser) {
    return reply.code(400).send({ error: 'Пользователь не найден' });
  }

  // Извлекаем названия групп
  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isCurrentSupervisor = userGroups.includes('Супервизор');
  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  if (isCurrentSupervisor) {
    if (!isReviewerExperienced) {
      return reply.code(400).send({
        error: 'Супервизоры могут отправлять часы только опытным супервизорам',
      });
    }
  } else {
    if (!isReviewerSupervisor) {
      return reply.code(400).send({
        error: 'Проверяющий должен быть супервизором или выше',
      });
    }
  }

  const record = await prisma.supervisionRecord.create({
    data: {
      userId,
      fileId,
      hours: {
        create: entries.map(({ type, value }) => ({
          type,
          value,
          status: RecordStatus.UNCONFIRMED,
          reviewerId: reviewer.id,
        })),
      },
    },
    include: {
      hours: true,
    },
  });

  return reply.code(201).send({ success: true, record });
}
