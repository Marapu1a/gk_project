// src/handlers/user/updateTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { CycleStatus, TargetLevel } from '@prisma/client';
import { setTargetLevelHandler } from '../users/setTargetLevel';

export async function updateTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { targetLevel, goalMode } = req.body as {
    targetLevel: TargetLevel | null;
    goalMode?: 'CERTIFICATION' | 'RENEWAL';
  };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  // 1) Если уже есть активный цикл — здесь запрещаем менять/ставить цель.
  // Для этого будет отдельная ручка "abort".
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: id, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true },
  });

  if (activeCycle) {
    return reply.code(400).send({
      error: 'ACTIVE_CYCLE_EXISTS',
      message:
        'У пользователя уже есть активный цикл. Сначала прервите цикл (ABANDONED), затем выбирайте цель заново.',
      cycle: { id: activeCycle.id, targetLevel: activeCycle.targetLevel },
    });
  }

  // 2) Если цикла нет — запускаем ту же логику, что у пользователя:
  // setTargetLevelHandler создаст ACTIVE cycle и поставит lock.
  // Эта ручка выступает как "админский помощник" и НЕ делает прямых апдейтов поля.
  (req as any).params = { id };
  (req as any).body = { targetLevel, goalMode };

  return setTargetLevelHandler(req as any, reply as any);
}
