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

  const { fileId, entries } = parsed.data;

  const record = await prisma.supervisionRecord.create({
    data: {
      userId,
      fileId,
      hours: {
        create: entries.map(({ type, value }) => ({
          type,
          value,
          status: RecordStatus.UNCONFIRMED,
        })),
      },
    },
    include: {
      hours: true,
    },
  });

  return reply.code(201).send({ success: true, record });
}
