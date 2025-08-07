import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getPaymentsByUserIdHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  const { userId } = req.params as { userId: string };

  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(payments);
}
