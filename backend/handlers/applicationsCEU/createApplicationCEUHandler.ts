// handlers/applicationsCEU/createApplicationCEUHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';
import { ceuApplicationSchema } from '../../schemas/ceuApplicationSchema';

export async function createApplicationCEUHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;
  const parsed = ceuApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { eventName, eventDate, fileId, ceu } = parsed.data;

  const ceuRecord = await prisma.cEURecord.create({
    data: {
      userId,
      eventName,
      eventDate: new Date(eventDate),
      fileId,
      entries: {
        create: ceu.map(entry => ({
          category: entry.category,
          value: entry.value,
          status: RecordStatus.UNCONFIRMED,
        })),
      },
    },
  });

  return reply.code(201).send({ success: true, ceuRecordId: ceuRecord.id });
}
