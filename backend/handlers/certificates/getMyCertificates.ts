// src/handlers/certificates/getMyCertificates.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getMyCertificatesHandler(req: FastifyRequest, reply: FastifyReply) {
  const auth = (req as any).user;
  if (!auth?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const now = new Date();

  const certs = await prisma.certificate.findMany({
    where: { userId: auth.userId },
    orderBy: { issuedAt: 'desc' },
    include: { group: true, file: true, confirmedBy: true },
  });

  return reply.send(
    certs.map((c) => ({
      id: c.id,
      title: c.title,
      number: c.number,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      isRenewal: c.isRenewal,
      previousId: c.previousId,
      group: { id: c.group.id, name: c.group.name, rank: c.group.rank },
      file: { id: c.file.id, name: c.file.name, fileId: c.file.fileId },
      confirmedBy: c.confirmedBy
        ? { id: c.confirmedBy.id, email: c.confirmedBy.email, fullName: c.confirmedBy.fullName }
        : null,
      isActiveNow: now <= c.expiresAt,
      isExpired: now > c.expiresAt,
    }))
  );
}
