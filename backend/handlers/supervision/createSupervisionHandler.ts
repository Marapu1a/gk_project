import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import { RecordStatus } from '@prisma/client';

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;
  const parsed = createSupervisionSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { fileId, entries, supervisorEmail } = parsed.data;

  const reviewer = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    select: { id: true },
  });

  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  const record = await prisma.supervisionRecord.create({
    data: {
      userId,
      fileId,
      hours: {
        create: entries.map(({ type, value }) => ({
          type,
          value,
          status: RecordStatus.UNCONFIRMED,
          reviewerId: reviewer.id,
        })),
      },
    },
    include: {
      hours: true,
    },
  });

  return reply.code(201).send({ success: true, record });
}
