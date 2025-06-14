import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createCeuSchema } from '../../schemas/ceu';
import { RecordStatus } from '@prisma/client';

export async function createCeuHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  const parsed = createCeuSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { eventName, eventDate, fileId, entries } = parsed.data;

  const ceuRecord = await prisma.cEURecord.create({
    data: {
      userId: user.userId,
      eventName,
      eventDate: new Date(eventDate),
      fileId,
      entries: {
        create: entries.map(entry => ({
          category: entry.category,
          value: entry.value,
          status: RecordStatus.CONFIRMED,
        })),
      },
    },
    include: {
      entries: true,
    },
  });

  return reply.code(201).send({ success: true, ceuRecord });
}
