// handlers/supervision/createSupervisionHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import { RecordStatus, PracticeLevel, CycleStatus, NotificationType } from '@prisma/client';
import { createNotification } from '../../utils/notifications';

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createSupervisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { fileId, entries } = parsed.data;
  const supervisorEmail = parsed.data.supervisorEmail.trim();

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const reviewer = await prisma.user.findFirst({
    where: { email: { equals: supervisorEmail, mode: 'insensitive' } },
    include: { groups: { include: { group: true } } },
    orderBy: [{ email: 'asc' }, { id: 'asc' }],
  });
  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  if (reviewer.id === userId) {
    return reply.code(400).send({ error: 'SELF_REVIEW_FORBIDDEN' });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!currentUser) {
    return reply.code(400).send({ error: 'Пользователь не найден' });
  }

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isAuthorSimpleSupervisor = userGroups.includes('Супервизор');
  const isAuthorExperiencedSupervisor = userGroups.includes('Опытный Супервизор');
  const isAuthorAnySupervisor = isAuthorSimpleSupervisor || isAuthorExperiencedSupervisor;

  const isReviewerAdmin = reviewer.role === 'ADMIN';
  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  if (isAuthorExperiencedSupervisor) {
    return reply.code(400).send({
      error: 'Опытные супервизоры не набирают часы. Для менторских часов выбирают вас.',
    });
  }

  if (isAuthorSimpleSupervisor && !(isReviewerExperienced || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Менторские часы можно отправлять только опытным супервизорам или админам',
    });
  }

  if (!isAuthorAnySupervisor && !(isReviewerSupervisor || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Часы практики можно отправлять только супервизорам, опытным супервизорам или админам',
    });
  }

  if (!entries?.length || entries.some((e) => !(e.value > 0))) {
    return reply.code(400).send({ error: 'Пустые или некорректные часы' });
  }

  const normalized: Array<{ type: PracticeLevel; value: number }> = [];

  if (isAuthorSimpleSupervisor) {
    for (const entry of entries) {
      if (entry.type && entry.type !== 'SUPERVISOR' && entry.type !== 'SUPERVISION') {
        return reply.code(400).send({
          error: 'Для супервизоров разрешены только менторские часы',
        });
      }

      normalized.push({
        type: PracticeLevel.SUPERVISOR,
        value: entry.value,
      });
    }
  } else {
    for (const entry of entries) {
      if (
        entry.type !== 'PRACTICE' &&
        entry.type !== 'IMPLEMENTING' &&
        entry.type !== 'PROGRAMMING'
      ) {
        return reply.code(400).send({
          error: 'Для часов практики разрешены типы PRACTICE, IMPLEMENTING и PROGRAMMING',
        });
      }

      normalized.push({
        type:
          entry.type === 'IMPLEMENTING'
            ? PracticeLevel.IMPLEMENTING
            : entry.type === 'PROGRAMMING'
              ? PracticeLevel.PROGRAMMING
              : PracticeLevel.PRACTICE,
        value: entry.value,
      });
    }
  }

  const record = await prisma.supervisionRecord.create({
    data: {
      userId,
      cycleId: activeCycle.id,
      fileId,
      hours: {
        create: normalized.map(({ type, value }) => ({
          type,
          value,
          status: RecordStatus.UNCONFIRMED,
          reviewerId: reviewer.id,
        })),
      },
    },
    include: { hours: true },
  });

  try {
    await createNotification({
      userId: reviewer.id,
      type: NotificationType.SUPERVISION,
      message: `Новая заявка на ${isAuthorSimpleSupervisor ? 'менторство' : 'супервизию'} от ${currentUser.email}`,
      link: '/review/supervision',
    });
  } catch (err) {
    req.log.error(err, 'SUPERVISION_CREATE notification failed');
  }

  return reply.code(201).send({ success: true, record });
}
