import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUserDetailsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      groups: {
        select: {
          group: { select: { id: true, name: true } },
        },
      },
      certificates: {
        select: {
          id: true,
          number: true,
          title: true,
          fileUrl: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
      ceuRecords: {
        select: {
          id: true,
          eventName: true,
          eventDate: true,
          fileId: true,
          entries: {
            select: {
              id: true,
              category: true,
              value: true,
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: {
                select: { email: true, fullName: true },
              },
            },
          },
        },
      },
      supervisionRecords: {
        select: {
          id: true,
          createdAt: true,
          hours: {
            select: {
              id: true,
              type: true,
              value: true,
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: {
                select: { email: true, fullName: true },
              },
            },
          },
        },
      },
      uploadedFiles: {
        select: {
          id: true,
          fileId: true,
          name: true,
          mimeType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  // Приводим groups к плоскому виду
  const groups = user.groups.map(g => g.group);

  return reply.send({ ...user, groups });
}
