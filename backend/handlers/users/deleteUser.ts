// src/handlers/users/deleteUser.ts
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface DeleteUserRoute extends RouteGenericInterface {
  Params: { id: string };
}

export async function deleteUserHandler(
  req: FastifyRequest<DeleteUserRoute>,
  reply: FastifyReply,
) {
  const actor = req.user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const me = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { role: true },
  });
  if (me?.role !== 'ADMIN') return reply.code(403).send({ error: 'Нет доступа' });

  return reply.code(410).send({
    error: 'Физическое удаление отключено. Используйте архивирование.',
  });
}
