import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateSupervisionHourRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
  };
}

/**
 * Ревью часов супервизии/практики:
 * - Доступ: назначенный ревьюер или админ.
 * - Разрешённые статусы: CONFIRMED | REJECTED.
 * - Для REJECTED обязательна причина (trim() != '').
 * - Финализированные записи можно править только админом (canOverride).
 * - Тип часа (PRACTICE/SUPERVISION/SUPERVISOR) здесь не меняем.
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
  if (actorRole !== 'REVIEWER' && actorRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }
  if (desiredStatus !== 'CONFIRMED' && desiredStatus !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }
  const rejectedReason = rejectedReasonRaw.trim();
  if (desiredStatus === 'REJECTED' && !rejectedReason) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  // Берём минимум полей. Тип часа не нужен для смены статуса.
  const existing = await prisma.supervisionHour.findUnique({
    where: { id },
    select: {
      status: true,
      reviewerId: true,
      record: { select: { userId: true } },
    },
  });
  if (!existing) return reply.code(404).send({ error: 'Заявка не найдена' });

  // Только назначенный ревьюер или админ
  const isAssignedReviewer = existing.reviewerId === actorId;
  const isAdmin = actorRole === 'ADMIN';
  if (!isAssignedReviewer && !isAdmin) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  // Ничего не меняем — короткий ответ (экономим запись в БД)
  if (existing.status === desiredStatus) {
    return reply.send({ success: true, updated: { id, status: existing.status } });
  }

  // Финализированные записи правим только админом
  const isFinal = existing.status === 'CONFIRMED' || existing.status === 'REJECTED';
  const canOverride = isAdmin; // если надо запретить всем — поставь false
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
