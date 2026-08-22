import assert from 'node:assert/strict';
import test from 'node:test';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import { buildPendingRecordsWhere } from './removePendingReviewerHoursAdminHandler';

const scope = {
  candidateId: 'candidate-1',
  cycleId: 'cycle-1',
  reviewerId: 'reviewer-1',
  hourTypes: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING],
};

test('limits admin removal to the selected pending application', () => {
  assert.deepEqual(
    buildPendingRecordsWhere({ ...scope, recordId: 'record-2' }),
    {
      id: 'record-2',
      userId: 'candidate-1',
      cycleId: 'cycle-1',
      hours: {
        some: {
          reviewerId: 'reviewer-1',
          type: { in: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING] },
          status: RecordStatus.UNCONFIRMED,
        },
      },
    },
  );
});

test('keeps the previous relation-wide scope when an older client omits recordId', () => {
  const where = buildPendingRecordsWhere({ ...scope, recordId: null });
  assert.equal('id' in where, false);
  assert.equal(where.userId, 'candidate-1');
  assert.equal(where.cycleId, 'cycle-1');
});
