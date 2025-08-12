import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getPaymentsByUserHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId?: string };
  if (!user?.userId) return reply.code(401).send({ error: 'Требуется авторизация' });

  const payments = await prisma.payment.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      comment: true,
      createdAt: true,
      confirmedAt: true,
      user: { select: { email: true } },
    },
  });

  return reply.send(payments);
}
