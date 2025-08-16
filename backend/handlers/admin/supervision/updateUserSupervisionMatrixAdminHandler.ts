// src/handlers/admin/supervision/updateUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import {
  labelSupervisionLevel,
  labelSupervisionStatus,
} from '../../../utils/labels';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
type Status = 'CONFIRMED' | 'UNCONFIRMED';

interface Route extends RouteGenericInterface {
  Params: { userId: string };
  Body: { level: Level; status: Status; value: number };
}

const bodySchema = z.object({
  level: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']),
  status: z.enum(['CONFIRMED', 'UNCONFIRMED']),
  value: z.number().min(0),
});

export async function updateUserSupervisionMatrixAdminHandler(
  req: FastifyRequest<Route>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { userId } = req.params;
  const { level, status, value } = parsed.data;

  // --- определяем активную группу пользователя (макс rank)
  const userWithGroups = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!userWithGroups) return reply.code(404).send({ error: 'Пользователь не найден' });

  const topGroup = userWithGroups.groups
    .map(g => g.group)
    .sort((a, b) => b.rank - a.rank)[0];

  const isSupervisorUser =
    topGroup?.name === 'Супервизор' || topGroup?.name === 'Опытный Супервизор';

  // --- правила редактирования
  if (!isSupervisorUser && level === 'SUPERVISOR') {
    return reply.code(403).send({ error: 'Менторские часы недоступны до уровня Супервизор' });
  }
  if (isSupervisorUser && (level === 'INSTRUCTOR' || level === 'CURATOR')) {
    return reply.code(403).send({ error: 'Инструкторские и кураторские часы у супервизоров не редактируются' });
  }

  // текущая сумма в ячейке
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: { record: { userId }, type: level, status },
    _sum: { value: true },
  });
  const current = grouped[0]?._sum.value ?? 0;

  if (current === value) {
    return reply.send({ ok: true, unchanged: true, current });
  }

  // очистка старых часов этой ячейки
  await prisma.supervisionHour.deleteMany({
    where: { record: { userId }, type: level, status },
  });

  // создать агрегат при value > 0
  if (value > 0) {
    let record = await prisma.supervisionRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) record = await prisma.supervisionRecord.create({ data: { userId } });

    const isConfirmed = status === 'CONFIRMED';
    const isUnconfirmed = status === 'UNCONFIRMED';

    await prisma.supervisionHour.create({
      data: {
        recordId: record.id,
        type: level,
        value,
        status,
        reviewerId: req.user.userId,                  // кто тронул — тот и назначен
        reviewedAt: isConfirmed ? new Date() : null,  // дату ставим только при CONFIRMED
        rejectedReason: null,
      },
    });

    // уведомление пользователю
    await prisma.notification.create({
      data: {
        userId,
        type: 'SUPERVISION',
        message: `Ваши часы (${labelSupervisionLevel(level)}, ${labelSupervisionStatus(status)}) были изменены администратором.`,
        link: '/history',
      },
    });

  }

  return reply.send({ ok: true, level, status, newValue: value });
}
