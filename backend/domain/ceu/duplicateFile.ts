import crypto from 'crypto';
import { Prisma, RecordStatus } from '@prisma/client';

type DuplicateLookupDb = Pick<Prisma.TransactionClient, 'cEURecord' | 'uploadedFile'>;

export type CeuFileDuplicate = {
  recordId: string;
  fileId: string;
  eventName: string;
  eventDate: Date;
};

export function calculateFileContentHash(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function findCeuFileDuplicate(
  db: DuplicateLookupDb,
  options: {
    userId: string;
    cycleId: string;
    contentHash: string;
    excludeFileId?: string;
  },
): Promise<CeuFileDuplicate | null> {
  const records = await db.cEURecord.findMany({
    where: {
      userId: options.userId,
      cycleId: options.cycleId,
      fileId: {
        not: null,
        ...(options.excludeFileId ? { notIn: [options.excludeFileId] } : {}),
      },
      entries: {
        some: {
          status: { not: RecordStatus.REJECTED },
        },
      },
    },
    select: {
      id: true,
      fileId: true,
      eventName: true,
      eventDate: true,
    },
  });

  const recordsWithFiles = records.filter(
    (record): record is typeof record & { fileId: string } => Boolean(record.fileId),
  );
  if (recordsWithFiles.length === 0) return null;

  const duplicateFile = await db.uploadedFile.findFirst({
    where: {
      userId: options.userId,
      contentHash: options.contentHash,
      fileId: { in: recordsWithFiles.map((record) => record.fileId) },
    },
    select: { fileId: true },
  });
  if (!duplicateFile) return null;

  const record = recordsWithFiles.find((item) => item.fileId === duplicateFile.fileId);
  if (!record) return null;

  return {
    recordId: record.id,
    fileId: record.fileId,
    eventName: record.eventName,
    eventDate: record.eventDate,
  };
}
