// src/handlers/admin/supervision/updateUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { PracticeLevel, RecordStatus, CycleStatus } from '@prisma/client';

// Принимаем legacy-уровни, но внутри работаем только с новыми.
type IncomingLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | 'PRACTICE' | 'SUPERVISION';
type NormalizedLevel = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
type Status = 'CONFIRMED' | 'UNCONFIRMED';

interface Route extends RouteGenericInterface {
  Params: { userId: string };
  Body: { level: IncomingLevel; status: Status; value: number };
}

const bodySchema = z.object({
  level: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR', 'PRACTICE', 'SUPERVISION']),
  status: z.enum(['CONFIRMED', 'UNCONFIRMED']),
  value: z.number().min(0),
});

// Приводим старые INSTRUCTOR/CURATOR к новой схеме PRACTICE/SUPERVISION
function normalizeLevel(lvl: IncomingLevel): NormalizedLevel {
  if (lvl === 'INSTRUCTOR') return 'PRACTICE';
  if (lvl === 'CURATOR') return 'SUPERVISION';
  if (lvl === 'PRACTICE' || lvl === 'SUPERVISION' || lvl === 'SUPERVISOR') return lvl;
  return 'PRACTICE';
}

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
  const incoming = parsed.data;

  const level = normalizeLevel(incoming.level);
  const status = incoming.status as RecordStatus; // CONFIRMED | UNCONFIRMED
  const value = incoming.value;

  // ❌ Супервизию руками больше не трогаем: она считается авто из практики
  if (level === 'SUPERVISION') {
    return reply.code(403).send({
      error: 'Часы супервизии считаются автоматически и не редактируются вручную',
    });
  }

  // --- пользователь и группы
  const userWithGroups = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!userWithGroups) return reply.code(404).send({ error: 'Пользователь не найден' });

  const topGroup = userWithGroups.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank)[0];
  const isSupervisorUser =
    topGroup?.name === 'Супервизор' || topGroup?.name === 'Опытный Супервизор';

  // --- активный цикл обязателен (в эпоху циклов правим только внутри него)
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  // --- правила редактирования:
  // до супервизора не даём править менторские,
  // у супервизоров не редактируем PRACTICE агрегатами.
  if (!isSupervisorUser && level === 'SUPERVISOR') {
    return reply.code(403).send({ error: 'Менторские часы недоступны до уровня Супервизор' });
  }
  if (isSupervisorUser && level === 'PRACTICE') {
    return reply.code(403).send({ error: 'Часы практики у супервизоров не редактируются агрегатами' });
  }

  // --- текущая сумма в ячейке (ТОЛЬКО ACTIVE cycle)
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: { userId, cycleId: activeCycle.id },
      type: level as PracticeLevel,
      status, // CONFIRMED/UNCONFIRMED
    },
    _sum: { value: true },
  });

  const current = (grouped[0]?._sum?.value ?? 0) as number;

  if (current === value) {
    return reply.send({ ok: true, unchanged: true, current, cycleId: activeCycle.id });
  }

  // --- очистка старых часов в этой ячейке (ТОЛЬКО ACTIVE cycle)
  await prisma.supervisionHour.deleteMany({
    where: {
      record: { userId, cycleId: activeCycle.id },
      type: level as PracticeLevel,
      status,
    },
  });

  // --- создаём агрегат единственной записью при value > 0
  if (value > 0) {
    let record = await prisma.supervisionRecord.findFirst({
      where: { userId, cycleId: activeCycle.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      record = await prisma.supervisionRecord.create({
        data: { userId, cycleId: activeCycle.id },
      });
    }

    const isConfirmed = status === 'CONFIRMED';

    await prisma.supervisionHour.create({
      data: {
        recordId: record.id,
        type: level as PracticeLevel,
        value,
        status,
        reviewerId: req.user.userId,
        reviewedAt: isConfirmed ? new Date() : null,
        rejectedReason: null,
      },
    });
  }

  return reply.send({ ok: true, level, status, newValue: value, cycleId: activeCycle.id });
}
