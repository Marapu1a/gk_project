import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createCeuSchema } from '../../schemas/ceu';
import { RecordStatus, CycleStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_ROOT } from '../../config/storage';
import { findCeuFileDuplicate, type CeuFileDuplicate } from '../../domain/ceu/duplicateFile';

class DuplicateCeuFileError extends Error {
  constructor(readonly duplicate: CeuFileDuplicate) {
    super('CEU_FILE_DUPLICATE');
  }
}

async function removeUnusedUploadedFile(fileId: string) {
  const file = await prisma.uploadedFile.findUnique({
    where: { fileId },
    select: { id: true, fileId: true },
  });
  if (!file) return;

  const linkedRecords = await prisma.cEURecord.count({ where: { fileId } });
  if (linkedRecords > 0) return;

  await prisma.uploadedFile.delete({ where: { id: file.id } });
  await fs.unlink(path.join(UPLOAD_ROOT, file.fileId)).catch(() => undefined);
}

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
    select: { id: true },
  });

  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const uploadedFile = await prisma.uploadedFile.findUnique({
    where: { fileId },
    select: { userId: true, fileId: true, contentHash: true },
  });
  if (
    !uploadedFile ||
    uploadedFile.userId !== user.userId ||
    !uploadedFile.fileId.startsWith(`${user.userId}/ceu/`)
  ) {
    return reply.code(400).send({ error: 'CEU_FILE_INVALID' });
  }

  const existingByFile = await prisma.cEURecord.findFirst({
    where: { fileId },
    select: { id: true },
  });
  if (existingByFile) {
    return reply.code(409).send({ error: 'CEU_FILE_ALREADY_USED' });
  }

  try {
    const ceuRecord = await prisma.$transaction(async (tx) => {
      if (uploadedFile.contentHash) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`ceu-file:${user.userId}:${uploadedFile.contentHash}`}))`;

        const duplicate = await findCeuFileDuplicate(tx, {
          userId: user.userId,
          cycleId: activeCycle.id,
          contentHash: uploadedFile.contentHash,
          excludeFileId: uploadedFile.fileId,
        });

        if (duplicate) throw new DuplicateCeuFileError(duplicate);
      }

      return tx.cEURecord.create({
        data: {
          userId: user.userId,
          cycleId: activeCycle.id,
          eventName,
          eventDate: new Date(eventDate),
          fileId,
          activityType: activityType ?? entries[0]?.activityType,
          entries: {
            create: entries.map((entry) => ({
              category: entry.category,
              activityType: entry.activityType,
              value: entry.value,
              status: RecordStatus.CONFIRMED,
            })),
          },
        },
        include: { entries: true },
      });
    });

    return reply.code(201).send({ success: true, ceuRecord, submittedBy: user.email });
  } catch (error) {
    if (error instanceof DuplicateCeuFileError) {
      if (fileId) {
        await removeUnusedUploadedFile(fileId);
      }
      return reply.code(409).send({
        error: 'CEU_FILE_DUPLICATE',
        duplicate: {
          recordId: error.duplicate.recordId,
          eventName: error.duplicate.eventName,
          eventDate: error.duplicate.eventDate,
        },
      });
    }

    throw error;
  }
}
