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
    return reply
      .code(400)
      .send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const { fileId, entries, supervisorEmail } = parsed.data;

  // --- reviewer (проверяющий) ---
  const reviewer = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    include: { groups: { include: { group: true } } },
  });
  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  // --- автор заявки ---
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!currentUser) {
    return reply.code(400).send({ error: 'Пользователь не найден' });
  }

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isAuthorSupervisor =
    userGroups.includes('Супервизор') || userGroups.includes('Опытный Супервизор');

  const isReviewerAdmin = reviewer.role === 'ADMIN';
  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  // автор — супервизор (он отправляет менторские часы):
  // ревьюер: опытный супервизор ИЛИ админ
  if (isAuthorSupervisor && !(isReviewerExperienced || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Супервизоры могут отправлять часы только опытным супервизорам или админам',
    });
  }

  // автор не супервизор (он отправляет часы практики):
  // ревьюер: супервизор/опытный супервизор ИЛИ админ
  if (!isAuthorSupervisor && !(isReviewerSupervisor || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Проверяющий должен быть супервизором, опытным супервизором или админом',
    });
  }

  if (!entries?.length || entries.some((e) => !(e.value > 0))) {
    return reply.code(400).send({ error: 'Пустые или некорректные часы' });
  }

  // Новая логика:
  // - НЕ супервизор: может отправлять ТОЛЬКО часы практики (PRACTICE).
  // - Супервизор / опытный супервизор: любые введённые часы считаем менторскими (SUPERVISOR).
  const normalized = entries.map(({ type, value }) => {
    if (isAuthorSupervisor) {
      // автор — супервизор, он фиксирует менторские часы
      return { type: PracticeLevel.SUPERVISOR, value };
    }

    // обычный пользователь — только практика
    if (type !== PracticeLevel.PRACTICE) {
      throw new Error('ONLY_PRACTICE_ALLOWED');
    }

    return { type: PracticeLevel.PRACTICE, value };
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
    if (e?.message === 'ONLY_PRACTICE_ALLOWED') {
      return reply.code(400).send({
        error:
          'Можно отправлять только часы практики. Часы супервизии теперь считаются автоматически.',
      });
    }
    throw e;
  }
}
