// src/handlers/certificates/getUserCertificates.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

export interface GetUserCertificatesRoute extends RouteGenericInterface {
  Params: { id: string };
}

export async function getUserCertificatesHandler(
  req: FastifyRequest<GetUserCertificatesRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user;
  if (!actor || actor.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const { id } = req.params;
  if (!id) return reply.code(400).send({ error: 'id обязателен' });

  const now = new Date();

  const certs = await prisma.certificate.findMany({
    where: { userId: id },
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
