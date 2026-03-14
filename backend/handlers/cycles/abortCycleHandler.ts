// src/handlers/cycles/abortCycleHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { CycleStatus } from '@prisma/client';

interface AbortCycleRoute extends RouteGenericInterface {
  Params: { id: string }; // cycleId
  Body?: { reason?: string };
}

export async function abortCycleHandler(
  req: FastifyRequest<AbortCycleRoute>,
  reply: FastifyReply
) {
  if (!req.user?.userId) return reply.code(401).send({ error: 'Не авторизован' });
  if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: 'Только администратор' });

  const cycleId = req.params.id;
  const reasonRaw = (req.body as any)?.reason ?? '';
  const reason = String(reasonRaw).trim() || 'Прервано администратором';

  const cycle = await prisma.certificationCycle.findUnique({
    where: { id: cycleId },
    select: { id: true, userId: true, status: true, targetLevel: true },
  });

  if (!cycle) return reply.code(404).send({ error: 'CYCLE_NOT_FOUND' });

  if (cycle.status !== CycleStatus.ACTIVE) {
    return reply.code(400).send({ error: 'CYCLE_NOT_ACTIVE' });
  }

  // предохранитель: если у юзера активный цикл другой — не трогаем
  const ownerActive = await prisma.certificationCycle.findFirst({
    where: { userId: cycle.userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });

  if (!ownerActive || ownerActive.id !== cycle.id) {
    return reply.code(400).send({ error: 'CYCLE_NOT_OWNER_ACTIVE' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCycle = await tx.certificationCycle.update({
      where: { id: cycle.id },
      data: {
        status: CycleStatus.ABANDONED,
        endedAt: new Date(),
        abandonedReason: reason,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        targetLevel: true,
        startedAt: true,
        endedAt: true,
        abandonedReason: true,
      },
    });

    // сбрасываем выбор цели и lock (возврат к "лесенке")
    await tx.user.update({
      where: { id: cycle.userId },
      data: { targetLevel: null, targetLockRank: null },
      select: { id: true },
    });

    await tx.notification.create({
      data: {
        userId: cycle.userId,
        type: 'DOCUMENT',
        message: `Цикл сертификации прерван администратором. Причина: ${reason}`,
        link: '/dashboard',
      },
    });

    return updatedCycle;
  });

  return reply.send({ ok: true, cycle: result });
}
