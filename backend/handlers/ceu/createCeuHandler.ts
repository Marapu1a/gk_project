import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createCeuSchema } from '../../schemas/ceu';
import { CEUCategory, RecordStatus, CycleStatus, CycleType, TargetLevel } from '@prisma/client';
import {
  ceuRequirementsByGroup,
  renewalCeuRequirementsByGroup,
  type CEUSummary,
} from '../../utils/ceuRequirements';

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const REQUIRED_KEY_BY_CATEGORY: Record<CEUCategory, keyof Omit<CEUSummary, 'total'>> = {
  ETHICS: 'ethics',
  CULTURAL_DIVERSITY: 'cultDiver',
  SUPERVISION: 'supervision',
  GENERAL: 'general',
};

export async function createCeuHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createCeuSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { eventName, eventDate, fileId, activityType, entries } = parsed.data;

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });

  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const groupName = RU_BY_LEVEL[activeCycle.targetLevel];
  const requirements =
    activeCycle.type === CycleType.RENEWAL
      ? renewalCeuRequirementsByGroup[groupName]
      : ceuRequirementsByGroup[groupName];

  const incomingByCategory = entries.reduce(
    (acc, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + entry.value;
      return acc;
    },
    {} as Partial<Record<CEUCategory, number>>,
  );

  const existingRows = await prisma.cEUEntry.groupBy({
    by: ['category'],
    where: {
      record: { userId: user.userId, cycleId: activeCycle.id },
      status: RecordStatus.CONFIRMED,
      category: { in: Object.keys(incomingByCategory) as CEUCategory[] },
    },
    _sum: { value: true },
  });
  const existingByCategory = existingRows.reduce(
    (acc, row) => {
      acc[row.category] = row._sum.value ?? 0;
      return acc;
    },
    {} as Partial<Record<CEUCategory, number>>,
  );

  for (const [category, incomingValue] of Object.entries(incomingByCategory) as Array<[CEUCategory, number]>) {
    const maxValue = requirements?.[REQUIRED_KEY_BY_CATEGORY[category]] ?? 0;
    const currentValue = existingByCategory[category] ?? 0;
    const remaining = Math.max(0, maxValue - currentValue);
    if (incomingValue > remaining) {
      return reply.code(400).send({
        error: `Можно добавить не более ${remaining} CEU-баллов в выбранной теме`,
        maxValue,
        remaining,
      });
    }
  }

  const ceuRecord = await prisma.cEURecord.create({
    data: {
      userId: user.userId,
      cycleId: activeCycle.id,
      eventName,
      eventDate: new Date(eventDate),
      fileId,
      activityType,
      entries: {
        create: entries.map((entry) => ({
          category: entry.category,
          value: entry.value,
          status: RecordStatus.CONFIRMED,
        })),
      },
    },
    include: { entries: true },
  });

  return reply.code(201).send({ success: true, ceuRecord, submittedBy: user.email });
}
