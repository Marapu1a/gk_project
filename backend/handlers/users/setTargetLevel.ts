// src/handlers/users/setTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
type Body = { targetLevel: TargetLevel | null };

const TARGET_NAME_BY_LEVEL: Record<TargetLevel, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export async function setTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  const { id } = (req.params as { id: string });
  const { targetLevel } = (req.body as Body);

  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });
  const isSelf = user.userId === id;
  const isAdmin = user.role === 'ADMIN';
  if (!isSelf && !isAdmin) return reply.code(403).send({ error: 'FORBIDDEN' });

  // Валидация payload
  if (targetLevel !== null && !['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'].includes(targetLevel)) {
    return reply.code(400).send({ error: 'INVALID_TARGET_LEVEL' });
  }

  // Получаем пользователя с группами (для active rank)
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      groups: { include: { group: { select: { name: true, rank: true } } } },
    },
  });
  if (!dbUser) return reply.code(404).send({ error: 'USER_NOT_FOUND' });

  const activeRank =
    dbUser.groups.map(g => g.group.rank).sort((a, b) => b - a)[0] ?? 0;

  // Если цель не null — проверяем, что не ниже текущего достигнутого уровня
  if (targetLevel) {
    // Берем ранги целевых групп из БД по названиям
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: Object.values(TARGET_NAME_BY_LEVEL) } },
      select: { name: true, rank: true },
    });

    const rankByName = new Map(targetGroups.map(g => [g.name, g.rank]));
    const targetName = TARGET_NAME_BY_LEVEL[targetLevel];
    const targetRank = rankByName.get(targetName);

    if (typeof targetRank !== 'number') {
      return reply.code(500).send({ error: 'TARGET_GROUP_NOT_CONFIGURED' });
    }
    if (targetRank < activeRank) {
      return reply.code(400).send({ error: 'TARGET_BELOW_ACTIVE' });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { targetLevel },
    select: { id: true, targetLevel: true },
  });

  return reply.send(updated);
}
