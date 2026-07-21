import fs from 'fs/promises';
import path from 'path';
import { RecordStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { UPLOAD_ROOT } from '../config/storage';
import { calculateFileContentHash } from '../domain/ceu/duplicateFile';

async function main() {
  const files = await prisma.uploadedFile.findMany({
    where: {
      contentHash: null,
      fileId: { contains: '/ceu/' },
    },
    select: { id: true, fileId: true },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  let missing = 0;
  const missingExamples: string[] = [];

  for (const file of files) {
    try {
      const buffer = await fs.readFile(path.join(UPLOAD_ROOT, file.fileId));
      const contentHash = calculateFileContentHash(buffer);
      await prisma.uploadedFile.update({
        where: { id: file.id },
        data: { contentHash },
      });
      updated += 1;
    } catch {
      missing += 1;
      if (missingExamples.length < 10) missingExamples.push(file.fileId);
    }
  }

  const records = await prisma.cEURecord.findMany({
    where: {
      fileId: { not: null },
      cycleId: { not: null },
      entries: { some: { status: { not: RecordStatus.REJECTED } } },
    },
    select: { id: true, userId: true, cycleId: true, fileId: true },
  });
  const storageIds = records.map((record) => record.fileId).filter(Boolean) as string[];
  const hashedFiles = storageIds.length
    ? await prisma.uploadedFile.findMany({
        where: { fileId: { in: storageIds }, contentHash: { not: null } },
        select: { fileId: true, contentHash: true },
      })
    : [];
  const hashByFileId = new Map(hashedFiles.map((file) => [file.fileId, file.contentHash]));
  const duplicateGroups = new Map<string, string[]>();

  for (const record of records) {
    if (!record.fileId || !record.cycleId) continue;
    const contentHash = hashByFileId.get(record.fileId);
    if (!contentHash) continue;
    const key = `${record.userId}:${record.cycleId}:${contentHash}`;
    const ids = duplicateGroups.get(key) ?? [];
    ids.push(record.id);
    duplicateGroups.set(key, ids);
  }

  const duplicates = [...duplicateGroups.values()].filter((ids) => ids.length > 1);
  console.log(
    JSON.stringify(
      {
        scanned: files.length,
        updated,
        missing,
        missingExamples,
        exactDuplicateGroups: duplicates.length,
        exactDuplicateRecords: duplicates.reduce((sum, ids) => sum + ids.length, 0),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
