import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';
import { supervisionApplicationSchema } from '../../schemas/supervisionApplicationSchema';

export async function createApplicationHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;
  const parsed = supervisionApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { hours, supervisorEmail } = parsed.data;

  const supervisor = await prisma.user.findUnique({
    where: { email: supervisorEmail },
  });

  if (!supervisor) {
    return reply.code(404).send({ error: 'Супервизор не найден' });
  }

  const supervisorGroups = await prisma.userGroup.findMany({
    where: { userId: supervisor.id },
    include: { group: true },
  });

  const isSupervisor = supervisorGroups.some(g => g.group.name === 'Супервизор' || g.group.name === 'Опытный Супервизор');

  if (!isSupervisor) {
    return reply.code(403).send({ error: 'Указанный пользователь не является супервизором' });
  }

  const supervisionRecord = await prisma.supervisionRecord.create({
    data: {
      userId,
      hours: {
        create: hours.map(entry => ({
          type: entry.type,
          value: entry.value,
          status: RecordStatus.UNCONFIRMED,
          reviewerId: supervisor.id,
        })),
      },
    },
  });

  return reply.code(201).send({
    success: true,
    supervisionRecordId: supervisionRecord.id,
    reviewer: {
      id: supervisor.id,
      fullName: supervisor.fullName,
      email: supervisor.email,
    },
  });
}
