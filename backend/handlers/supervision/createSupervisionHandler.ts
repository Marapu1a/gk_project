// handlers/supervision/createSupervisionHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import { RecordStatus, PracticeLevel } from '@prisma/client';

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createSupervisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const { fileId, entries, supervisorEmail } = parsed.data;

  // --- reviewer (проверяющий) ---
  const reviewer = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    include: { groups: { include: { group: true } } },
  });
  if (!reviewer) return reply.code(400).send({ error: 'Супервизор с таким email не найден' });

  // --- автор заявки ---
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!currentUser) return reply.code(400).send({ error: 'Пользователь не найден' });

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isAuthorSupervisor =
    userGroups.includes('Супервизор') || userGroups.includes('Опытный Супервизор');

  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  // Автор-супервизор может отправлять только опытному супервизору
  if (isAuthorSupervisor && !isReviewerExperienced) {
    return reply.code(400).send({
      error: 'Супервизоры могут отправлять часы только опытным супервизорам',
    });
  }
  // Автор-несупервизор — только супервизору/опытному
  if (!isAuthorSupervisor && !isReviewerSupervisor) {
    return reply.code(400).send({
      error: 'Проверяющий должен быть супервизором или выше',
    });
  }

  // Базовая валидация записей
  if (!entries?.length || entries.some((e) => !(e.value > 0))) {
    return reply.code(400).send({ error: 'Пустые или некорректные часы' });
  }

  // Нормализация типов:
  // - если автор супервизор/опытный → ВСЕ записи принудительно SUPERVISOR (менторские часы)
  // - если автор не супервизор → SUPERVISOR запрещён
  const normalized = entries.map(({ type, value }) => {
    if (isAuthorSupervisor) {
      return { type: PracticeLevel.SUPERVISOR, value };
    }
    if (type === PracticeLevel.SUPERVISOR) {
      throw new Error('FORBIDDEN_SUPERVISOR_HOURS');
    }
    return { type, value };
  });

  try {
    const record = await prisma.supervisionRecord.create({
      data: {
        userId,
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
  } catch (e: any) {
    if (e?.message === 'FORBIDDEN_SUPERVISOR_HOURS') {
      return reply.code(400).send({
        error: 'Часы SUPERVISOR доступны только для авторов с уровнем Супервизор/Опытный супервизор',
      });
    }
    throw e;
  }
}
