import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateUserVisibilityHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { isProfileVisible } = req.body as { isProfileVisible?: boolean };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (typeof isProfileVisible !== 'boolean') {
    return reply.code(400).send({ error: 'isProfileVisible должен быть boolean' });
  }

  await prisma.user.update({
    where: { id },
    data: { isProfileVisible },
  });

  return reply.send({
    ok: true,
    isProfileVisible,
  });
}
