// handlers/supervision/createSupervisionHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import { RecordStatus, PracticeLevel, CycleStatus } from '@prisma/client';

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createSupervisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { fileId, entries, supervisorEmail } = parsed.data;

  // активный цикл обязателен
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  // reviewer (проверяющий)
  const reviewer = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    include: { groups: { include: { group: true } } },
  });
  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  // запрет ревьюить самого себя
  if (reviewer.id === userId) {
    return reply.code(400).send({ error: 'SELF_REVIEW_FORBIDDEN' });
  }

  // автор заявки
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!currentUser) {
    return reply.code(400).send({ error: 'Пользователь не найден' });
  }

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  // авторские группы
  const isAuthorSimpleSupervisor = userGroups.includes('Супервизор');
  const isAuthorExperiencedSupervisor = userGroups.includes('Опытный Супервизор');
  const isAuthorAnySupervisor = isAuthorSimpleSupervisor || isAuthorExperiencedSupervisor;

  // ревьюерские роли/группы
  const isReviewerAdmin = reviewer.role === 'ADMIN';
  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  // опытный супервизор не набирает часы вообще
  if (isAuthorExperiencedSupervisor) {
    return reply.code(400).send({
      error: 'Опытные супервизоры не набирают часы. Для менторских часов выбирают вас.',
    });
  }

  // ===== Правила адресата =====
  // 1) Часы практики → супервизоры, опытные супервизоры, админы
  // 2) Менторские часы (для "Супервизора") → опытные супервизоры, админы

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

  // ✅ Новая модель: type из запроса игнорируем полностью (никакого легаси)
  const normalized = entries.map(({ value }) => ({
    type: isAuthorSimpleSupervisor ? PracticeLevel.SUPERVISOR : PracticeLevel.PRACTICE,
    value,
  }));

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

  return reply.code(201).send({ success: true, record });
}
