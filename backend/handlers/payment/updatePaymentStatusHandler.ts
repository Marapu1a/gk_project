import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updatePaymentSchema } from '../../schemas/updatePaymentSchema';

export async function updatePaymentStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  const { id } = req.params as { id: string };

  if (!user) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { status, comment } = parsed.data;

  // Только админ может ставить статус PAID
  if (status === 'PAID' && user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только админ может подтверждать оплату' });
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status,
      confirmedAt: status === 'PAID' ? new Date() : null,
      comment,
    },
  });

  return reply.send({ payment });
}
