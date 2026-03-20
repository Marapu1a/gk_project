import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, CycleStatus } from '@prisma/client';

interface UpdateSupervisionHourRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
  };
}

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

  const existing = await prisma.supervisionHour.findUnique({
    where: { id },
    select: {
      status: true,
      reviewerId: true,
      type: true,
      record: { select: { userId: true, cycleId: true } },
    },
  });

  if (!existing) return reply.code(404).send({ error: 'Заявка не найдена' });

  const isAdmin = actorRole === 'ADMIN';
  const isAssignedReviewer = existing.reviewerId === actorId;
  const recordOwnerId = existing.record.userId;

  if (!isAdmin && recordOwnerId === actorId) {
    return reply.code(403).send({ error: 'Нельзя проверять собственные часы' });
  }

  if (!existing.record.cycleId) {
    return reply.code(400).send({ error: 'SUPERVISION_NOT_LINKED_TO_CYCLE' });
  }

  const ownerActiveCycle = await prisma.certificationCycle.findFirst({
    where: { userId: recordOwnerId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });

  if (!ownerActiveCycle || ownerActiveCycle.id !== existing.record.cycleId) {
    return reply.code(400).send({ error: 'SUPERVISION_NOT_IN_ACTIVE_CYCLE' });
  }

  const [actor, recordOwner] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorId },
      select: { groups: { select: { group: { select: { name: true } } } } },
    }),
    prisma.user.findUnique({
      where: { id: recordOwnerId },
      select: { groups: { select: { group: { select: { name: true } } } } },
    }),
  ]);

  const actorGroupNames = (actor?.groups ?? []).map((g) => g.group.name);
  const ownerGroupNames = (recordOwner?.groups ?? []).map((g) => g.group.name);

  const isActorExperiencedSupervisor = actorGroupNames.includes('Опытный Супервизор');
  const isActorSupervisor = actorGroupNames.includes('Супервизор') || isActorExperiencedSupervisor;

  const isOwnerInstructorOrCurator =
    ownerGroupNames.includes('Инструктор') || ownerGroupNames.includes('Куратор');

  const isPracticeHour =
    existing.type === PracticeLevel.PRACTICE ||
    existing.type === PracticeLevel.IMPLEMENTING ||
    existing.type === PracticeLevel.PROGRAMMING;

  const isMentorHour = existing.type === PracticeLevel.SUPERVISOR;

  const canUseAssigned = isAssignedReviewer && (isAdmin || isActorSupervisor);

  let canReview = false;

  if (isAdmin) {
    canReview = true;
  } else if (canUseAssigned) {
    canReview = true;
  } else if (isMentorHour) {
    canReview = isActorExperiencedSupervisor;
  } else if (isPracticeHour && isOwnerInstructorOrCurator) {
    canReview = isActorSupervisor;
  }

  if (!canReview) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (existing.status === desiredStatus) {
    return reply.send({ success: true, updated: { id, status: existing.status } });
  }

  const isFinal = existing.status === 'CONFIRMED' || existing.status === 'REJECTED';
  if (isFinal && !isAdmin) {
    return reply.code(400).send({ error: 'Статус уже установлен и не может быть изменён' });
  }

  const updated = await prisma.supervisionHour.update({
    where: { id },
    data: {
      status: desiredStatus,
      reviewedAt: new Date(),
      rejectedReason: desiredStatus === 'REJECTED' ? rejectedReason : null,
      reviewerId: actorId,
    },
  });

  return reply.send({ success: true, updated });
}
