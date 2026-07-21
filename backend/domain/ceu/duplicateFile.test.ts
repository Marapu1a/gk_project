import assert from 'node:assert/strict';
import test from 'node:test';
import { RecordStatus } from '@prisma/client';
import { calculateFileContentHash, findCeuFileDuplicate } from './duplicateFile';

test('calculateFileContentHash returns the same hash for identical bytes', () => {
  const first = calculateFileContentHash(Buffer.from('same CEU document'));
  const second = calculateFileContentHash(Buffer.from('same CEU document'));

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test('calculateFileContentHash distinguishes different bytes', () => {
  const first = calculateFileContentHash(Buffer.from('first CEU document'));
  const second = calculateFileContentHash(Buffer.from('second CEU document'));

  assert.notEqual(first, second);
});

test('findCeuFileDuplicate searches only non-rejected records in the same cycle', async () => {
  let recordWhere: unknown;
  const db = {
    cEURecord: {
      findMany: async ({ where }: { where: unknown }) => {
        recordWhere = where;
        return [
          {
            id: 'record-1',
            fileId: 'user/ceu/file.pdf',
            eventName: 'Тренинг',
            eventDate: new Date('2026-07-20T00:00:00.000Z'),
          },
        ];
      },
    },
    uploadedFile: {
      findFirst: async () => ({ fileId: 'user/ceu/file.pdf' }),
    },
  } as unknown as Parameters<typeof findCeuFileDuplicate>[0];

  const result = await findCeuFileDuplicate(db, {
    userId: 'user-1',
    cycleId: 'cycle-1',
    contentHash: 'hash-1',
    excludeFileId: 'new-file.pdf',
  });

  assert.deepEqual(recordWhere, {
    userId: 'user-1',
    cycleId: 'cycle-1',
    fileId: { not: null, notIn: ['new-file.pdf'] },
    entries: { some: { status: { not: RecordStatus.REJECTED } } },
  });
  assert.equal(result?.recordId, 'record-1');
});

test('findCeuFileDuplicate does not query files when there are no candidate records', async () => {
  let fileLookupCalled = false;
  const db = {
    cEURecord: { findMany: async () => [] },
    uploadedFile: {
      findFirst: async () => {
        fileLookupCalled = true;
        return null;
      },
    },
  } as unknown as Parameters<typeof findCeuFileDuplicate>[0];

  const result = await findCeuFileDuplicate(db, {
    userId: 'user-1',
    cycleId: 'cycle-1',
    contentHash: 'hash-1',
  });

  assert.equal(result, null);
  assert.equal(fileLookupCalled, false);
});
