import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export const getMyCEU = async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user?.userId;
  if (!userId) return reply.status(401).send({ error: 'Нет userId' });

  const records = await prisma.cEURecord.findMany({
    where: {
      userId,
      is_valid: true,
    },
    orderBy: { event_date: 'desc' },
  });

  const total = {
    ethics: 0,
    cultDiver: 0,
    supervision: 0,
    general: 0,
  };

  for (const record of records) {
    total.ethics += record.ceu_ethics || 0;
    total.cultDiver += record.ceu_cult_diver || 0;
    total.supervision += record.ceu_superv || 0;
    total.general += record.ceu_general || 0;
  }

  reply.send({ total, records });
};
