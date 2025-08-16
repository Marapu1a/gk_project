import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

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
  const { status, rejectedReason } = req.body;

  if (!actorId) return reply.code(401).send({ error: 'Не авторизован' });
  if (actorRole !== 'REVIEWER' && actorRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }
  if (status !== 'CONFIRMED' && status !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }
  if (status === 'REJECTED' && !rejectedReason?.trim()) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

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

  // Финализированные записи правим только админом (или запрещаем вовсе)
  const isFinal = existing.status === 'CONFIRMED' || existing.status === 'REJECTED';
  const canOverride = isAdmin; // ← если нужно запретить всем, поменяй на false
  if (isFinal && !canOverride) {
    return reply.code(400).send({ error: 'Статус уже установлен и не может быть изменён' });
  }

  const updated = await prisma.supervisionHour.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? rejectedReason!.trim() : null,
      reviewerId: existing.reviewerId ?? actorId, // подстраховка
    },
  });

  return reply.send({ success: true, updated });
}
