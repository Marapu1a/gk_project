import assert from 'node:assert/strict';
import test from 'node:test';
import { findPotentialCeuDuplicates, type CeuDuplicateCandidate } from './potentialDuplicates';

function record(
  id: string,
  overrides: Partial<CeuDuplicateCandidate> = {},
): CeuDuplicateCandidate {
  return {
    id,
    userId: 'user-1',
    cycleId: 'cycle-1',
    fileId: `${id}.pdf`,
    eventName: 'Этика: работа с семьёй',
    eventDate: new Date('2026-10-10T00:00:00.000Z'),
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
    points: 2,
    status: 'CONFIRMED',
    ...overrides,
  };
}

test('warns about the same event and date even when the file and cycle changed', () => {
  const matches = findPotentialCeuDuplicates([
    record('old'),
    record('new', {
      cycleId: 'cycle-2',
      eventName: '  ЭТИКА — работа с семьей!  ',
      fileId: 'rescan.jpg',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    }),
  ]);

  assert.equal(matches.get('new')?.count, 1);
  assert.equal(matches.get('new')?.matches[0]?.id, 'old');
  assert.equal(matches.get('old')?.matches[0]?.fileId, 'rescan.jpg');
});

test('ignores another user, another event date, and rejected records', () => {
  const matches = findPotentialCeuDuplicates([
    record('base'),
    record('other-user', { userId: 'user-2' }),
    record('other-date', { eventDate: new Date('2026-10-11T00:00:00.000Z') }),
    record('rejected', { status: 'REJECTED' }),
  ]);

  assert.equal(matches.size, 0);
});
