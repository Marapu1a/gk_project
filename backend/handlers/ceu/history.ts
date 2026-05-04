// src/handlers/ceu/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function ceuHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!activeCycle) return reply.send([]);

  const entries = await prisma.cEUEntry.findMany({
    where: { record: { userId, cycleId: activeCycle.id } },
    orderBy: [{ record: { eventDate: 'desc' } }, { id: 'desc' }],
    select: {
      id: true,
      category: true,
      value: true,
      status: true,
      rejectedReason: true,
      record: {
        select: {
          eventDate: true,
          eventName: true,
          activityType: true,
          fileId: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const fileIds = entries.map((e) => e.record.fileId).filter(Boolean) as string[];
  const files = fileIds.length
    ? await prisma.uploadedFile.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, name: true, mimeType: true },
      })
    : [];
  const fileByStorageId = new Map(files.map((file) => [file.fileId, file]));

  return reply.send(
    entries.map((e) => ({
      id: e.id,
      category: e.category,
      value: e.value,
      status: e.status,
      eventDate: e.record.eventDate,
      eventName: e.record.eventName,
      activityType: e.record.activityType,
      file: e.record.fileId ? fileByStorageId.get(e.record.fileId) ?? null : null,
      user: e.record.user,
      rejectedReason: e.rejectedReason,
    }))
  );
}
