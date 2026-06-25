import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUserActionLogHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };

  const logs = await prisma.adminUserActionLog.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      admin: { select: { email: true, fullName: true } },
    },
  });

  return reply.send(
    logs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
      adminEmail: log.admin?.email ?? '—',
      adminName: log.admin?.fullName ?? null,
    })),
  );
}
