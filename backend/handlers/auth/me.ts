// src/handlers/auth/me.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      fullNameLatin: true,
      phone: true,
      birthDate: true,
      country: true,
      city: true,
      avatarUrl: true,
      bio: true,
      targetLevel: true,
      targetLockRank: true,
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const groupList = dbUser.groups
    .map(({ group }) => ({ id: group.id, name: group.name, rank: group.rank }))
    .sort((a, b) => b.rank - a.rank);

  const activeGroup = groupList[0]
    ? { id: groupList[0].id, name: groupList[0].name, rank: groupList[0].rank }
    : null;

  return reply.send({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    fullName: dbUser.fullName,
    fullNameLatin: dbUser.fullNameLatin, // ← отдали в ответ
    phone: dbUser.phone,
    birthDate: dbUser.birthDate,
    country: dbUser.country,
    city: dbUser.city,
    avatarUrl: dbUser.avatarUrl,
    bio: dbUser.bio,
    targetLevel: dbUser.targetLevel,
    targetLockRank: dbUser.targetLockRank,
    groups: groupList.map(({ id, name }) => ({ id, name })),
    activeGroup,
  });
}
