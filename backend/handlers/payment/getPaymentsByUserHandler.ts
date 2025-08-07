import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getPaymentsByUserHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  if (!user) return reply.code(401).send({ error: 'Требуется авторизация' });

  const payments = await prisma.payment.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(payments);;
}
