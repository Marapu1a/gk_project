import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function listSupervisionContractsHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const contracts = await prisma.supervisionContract.findMany({
    where: { userId },
    include: {
      file: true,
      supervisor: { select: { id: true, email: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send({ contracts });
}

