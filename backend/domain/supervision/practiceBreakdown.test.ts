import assert from 'node:assert/strict';
import test from 'node:test';
import { PracticeLevel } from '@prisma/client';
import { aggregatePracticeBreakdown } from './practiceBreakdown';

test('legacy hours participate in the cumulative balance as a neutral 50/50 split', () => {
  assert.deepEqual(
    aggregatePracticeBreakdown([
      { type: PracticeLevel.PRACTICE, _sum: { value: 501 } },
      { type: PracticeLevel.IMPLEMENTING, _sum: { value: 100 } },
      { type: PracticeLevel.PROGRAMMING, _sum: { value: 50 } },
    ]),
    { implementing: 350.5, programming: 300.5, total: 651 },
  );
});

test('preserves the existing rule that old level rows are not practice hours', () => {
  assert.deepEqual(
    aggregatePracticeBreakdown([
      { type: PracticeLevel.INSTRUCTOR, _sum: { value: 300 } },
      { type: PracticeLevel.CURATOR, _sum: { value: 500 } },
      { type: PracticeLevel.PRACTICE, _sum: { value: 100 } },
    ]),
    { implementing: 50, programming: 50, total: 100 },
  );
});
