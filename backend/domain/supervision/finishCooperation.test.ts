import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma, ReviewerCandidateKind, ReviewerCandidateStatus, RecordStatus } from '@prisma/client';
import { finishCooperation } from './finishCooperation';

const relation = {
  id: 'relation-1', reviewerId: 'reviewer-1', candidateId: 'candidate-1',
  cycleId: 'cycle-1', kind: ReviewerCandidateKind.SUPERVISION,
};

test('finishing archives the period and cancels only pending hours for its pair and cycle', async () => {
  const calls: any[] = [];
  const tx = {
    reviewerCandidateRelation: { updateMany: async (args: any) => { calls.push(['relation', args]); return { count: 1 }; } },
    supervisionHour: { updateMany: async (args: any) => { calls.push(['hours', args]); return { count: 2 }; } },
  } as unknown as Prisma.TransactionClient;
  const endedAt = new Date('2026-10-05T10:00:00Z');
  const result = await finishCooperation(tx, relation, { endedById: 'candidate-1', reason: 'MANUAL', endedAt });
  assert.deepEqual(result, { cancelledHours: 2 });
  assert.equal(calls[0][1].data.status, ReviewerCandidateStatus.ENDED);
  assert.equal(calls[0][1].data.endedById, 'candidate-1');
  assert.equal(calls[1][1].where.status, RecordStatus.UNCONFIRMED);
  assert.equal(calls[1][1].where.reviewerId, relation.reviewerId);
  assert.deepEqual(calls[1][1].where.record, { userId: relation.candidateId, cycleId: relation.cycleId });
  assert.equal(calls[1][1].data.status, RecordStatus.REJECTED);
});

test('a repeated finish does not cancel hours from a new period', async () => {
  let cancelled = false;
  const tx = {
    reviewerCandidateRelation: { updateMany: async () => ({ count: 0 }) },
    supervisionHour: { updateMany: async () => { cancelled = true; return { count: 0 }; } },
  } as unknown as Prisma.TransactionClient;
  assert.equal(await finishCooperation(tx, relation, {
    endedById: null, reason: 'CERTIFICATE_ISSUED', endedAt: new Date(),
  }), null);
  assert.equal(cancelled, false);
});
