import { FastifyRequest, FastifyReply } from 'fastify';
import { CycleStatus, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type CeuHistoryPeriod = 'current' | 'legacy';

function aggregateStatus(statuses: RecordStatus[]) {
  if (statuses.length === 0) return RecordStatus.UNCONFIRMED;
  if (statuses.every((status) => status === RecordStatus.SPENT)) return RecordStatus.SPENT;
  if (statuses.includes(RecordStatus.REJECTED)) return RecordStatus.REJECTED;
  if (statuses.includes(RecordStatus.UNCONFIRMED)) return RecordStatus.UNCONFIRMED;
  if (statuses.includes(RecordStatus.CONFIRMED)) return RecordStatus.CONFIRMED;
  return RecordStatus.UNCONFIRMED;
}

export async function ceuHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const requestedPeriod = (req.query as { period?: unknown }).period;
  if (
    requestedPeriod !== undefined &&
    requestedPeriod !== 'current' &&
    requestedPeriod !== 'legacy'
  ) {
    return reply.code(400).send({ error: 'Некорректный период истории CEU' });
  }
  const period: CeuHistoryPeriod = requestedPeriod === 'legacy' ? 'legacy' : 'current';

  const activeCycle =
    period === 'current'
      ? await prisma.certificationCycle.findFirst({
          where: { userId, status: CycleStatus.ACTIVE },
          select: { id: true },
        })
      : null;

  if (period === 'current' && !activeCycle) return reply.send([]);

  const records = await prisma.cEURecord.findMany({
    where: {
      userId,
      cycleId: period === 'legacy' ? null : activeCycle!.id,
    },
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      eventDate: true,
      eventName: true,
      activityType: true,
      fileId: true,
      user: { select: { fullName: true, email: true } },
      entries: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          category: true,
          activityType: true,
          value: true,
          status: true,
          rejectedReason: true,
          isAdminCorrection: true,
          previousValue: true,
        },
      },
    },
  });

  const fileIds = records.map((record) => record.fileId).filter(Boolean) as string[];
  const files = fileIds.length
    ? await prisma.uploadedFile.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, name: true, mimeType: true },
      })
    : [];
  const fileByStorageId = new Map(files.map((file) => [file.fileId, file]));

  return reply.send(
    records.map((record) => ({
      id: record.id,
      totalValue: record.entries.reduce((sum, entry) => sum + entry.value, 0),
      status: aggregateStatus(record.entries.map((entry) => entry.status)),
      eventDate: record.eventDate,
      eventName: record.eventName,
      isAdminCorrection: record.entries.some((entry) => entry.isAdminCorrection),
      file: record.fileId ? fileByStorageId.get(record.fileId) ?? null : null,
      user: record.user,
      rejectedReason:
        record.entries.find((entry) => entry.rejectedReason)?.rejectedReason ?? null,
      entries: record.entries.map((entry) => ({
        ...entry,
        activityType: entry.activityType ?? record.activityType,
      })),
    })),
  );
}
