import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function listCeuHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!activeCycle) return reply.send({ records: [] });

  const records = await prisma.cEURecord.findMany({
    where: { userId, cycleId: activeCycle.id },
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    include: { entries: true },
  });

  return reply.send({ records });
}
