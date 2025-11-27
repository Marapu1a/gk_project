import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel } from '@prisma/client';

interface UpdateSupervisionHourRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
  };
}

/**
 * Ревью часов супервизии/практики:
 * - Доступ: любой авторизованный пользователь, дальше решают группы + админ.
 * - Базовое правило: назначенный ревьюер или админ.
 * - Новая логика по правам:
 *   - Менторские часы (type = SUPERVISOR):
 *       • может подтверждать ADMIN;
 *       • может подтверждать любой "Опытный Супервизор".
 *   - Часы практики (type = PRACTICE), которые отправили Инструкторы/Кураторы:
 *       • может подтверждать ADMIN;
 *       • могут подтверждать "Супервизор" и "Опытный Супервизор".
 *   - Во всех остальных случаях:
 *       • только назначенный ревьюер (existing.reviewerId) или ADMIN.
 * - Нельзя ревьюить свои собственные часы (кроме админа).
 * - Разрешённые статусы: CONFIRMED | REJECTED.
 * - Для REJECTED обязательна причина (trim() != '').
 * - Финализированные записи можно править только админом (canOverride = isAdmin).
 */
export async function updateSupervisionHourHandler(
  req: FastifyRequest<UpdateSupervisionHourRoute>,
  reply: FastifyReply
) {
  const actorId = req.user?.userId;
  const actorRole = req.user?.role;
  const { id } = req.params;
  const desiredStatus = req.body?.status;
  const rejectedReasonRaw = req.body?.rejectedReason ?? '';

  if (!actorId) return reply.code(401).send({ error: 'Не авторизован' });

  if (desiredStatus !== 'CONFIRMED' && desiredStatus !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }
  const rejectedReason = rejectedReasonRaw.trim();
  if (desiredStatus === 'REJECTED' && !rejectedReason) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  // Берём час + владельца записи (userId)
  const existing = await prisma.supervisionHour.findUnique({
    where: { id },
    select: {
      status: true,
      reviewerId: true,
      type: true,
      record: {
        select: {
          userId: true,
        },
      },
    },
  });
  if (!existing) return reply.code(404).send({ error: 'Заявка не найдена' });

  const isAdmin = actorRole === 'ADMIN';
  const isAssignedReviewer = existing.reviewerId === actorId;
  const recordOwnerId = existing.record.userId;

  // Нельзя ревьюить свои собственные часы (кроме админа)
  if (!isAdmin && recordOwnerId === actorId) {
    return reply.code(403).send({ error: 'Нельзя проверять собственные часы' });
  }

  // Подтягиваем группы действующего пользователя
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: {
      groups: {
        select: {
          group: { select: { name: true } },
        },
      },
    },
  });

  // Подтягиваем группы владельца записи, чтобы понять, кто он (Инструктор/Куратор и т.п.)
  const recordOwner = await prisma.user.findUnique({
    where: { id: recordOwnerId },
    select: {
      groups: {
        select: {
          group: { select: { name: true } },
        },
      },
    },
  });

  const actorGroupNames = (actor?.groups ?? []).map((g) => g.group.name);
  const ownerGroupNames = (recordOwner?.groups ?? []).map((g) => g.group.name);

  const isActorExperiencedSupervisor = actorGroupNames.includes('Опытный Супервизор');
  const isActorSupervisor =
    actorGroupNames.includes('Супервизор') || isActorExperiencedSupervisor;

  const isOwnerInstructorOrCurator =
    ownerGroupNames.includes('Инструктор') || ownerGroupNames.includes('Куратор');

  // Определяем, имеет ли право менять этот час
  let canReview = false;

  if (isAdmin) {
    canReview = true;
  } else if (isAssignedReviewer) {
    // старое правило: назначенный ревьюер всегда может ревьюить (кроме своих собственных часов, это выше отфильтровано)
    canReview = true;
  } else if (existing.type === PracticeLevel.SUPERVISOR) {
    // менторские часы: может подтверждать только опытный супервизор
    canReview = isActorExperiencedSupervisor;
  } else if (existing.type === PracticeLevel.PRACTICE && isOwnerInstructorOrCurator) {
    // часы практики Инструкторов / Кураторов: могут подтверждать супервизоры и опытные супервизоры
    canReview = isActorSupervisor;
  }

  if (!canReview) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  // Ничего не меняем — короткий ответ (экономим запись в БД)
  if (existing.status === desiredStatus) {
    return reply.send({ success: true, updated: { id, status: existing.status } });
  }

  // Финализированные записи правим только админом
  const isFinal = existing.status === 'CONFIRMED' || existing.status === 'REJECTED';
  const canOverride = isAdmin; // если надо запретить всем — оставляем только админа
  if (isFinal && !canOverride) {
    return reply.code(400).send({ error: 'Статус уже установлен и не может быть изменён' });
  }

  const updated = await prisma.supervisionHour.update({
    where: { id },
    data: {
      status: desiredStatus,
      reviewedAt: new Date(),
      rejectedReason: desiredStatus === 'REJECTED' ? rejectedReason : null,
      // подстраховка: если по каким-то причинам reviewerId ещё пустой — фиксируем его
      reviewerId: existing.reviewerId ?? actorId,
    },
  });

  return reply.send({ success: true, updated });
}
