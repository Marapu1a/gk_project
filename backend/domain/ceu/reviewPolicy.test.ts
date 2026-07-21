import assert from 'node:assert/strict';
import test from 'node:test';
import { RecordStatus } from '@prisma/client';
import { getCeuReviewTransitionError } from './reviewPolicy';

test('rejected CEU application cannot be restored', () => {
  assert.equal(
    getCeuReviewTransitionError([RecordStatus.REJECTED]),
    'CEU_REJECTION_IRREVERSIBLE',
  );
});

test('spent CEU application remains irreversible', () => {
  assert.equal(
    getCeuReviewTransitionError([RecordStatus.SPENT]),
    'CEU_SPENT_IRREVERSIBLE',
  );
});

test('confirmed and unconfirmed CEU applications can still be reviewed', () => {
  assert.equal(getCeuReviewTransitionError([RecordStatus.CONFIRMED]), null);
  assert.equal(getCeuReviewTransitionError([RecordStatus.UNCONFIRMED]), null);
});
