import assert from 'node:assert/strict';
import test from 'node:test';
import { PracticeLevel } from '@prisma/client';
import {
  aggregateSupervisionHistoryHours,
  isLegacySupervisionHistoryRecord,
  SUPERVISION_HISTORY_HOUR_TYPES,
} from './historyPractice';

test('keeps processed legacy applications visible and displays their total neutrally', () => {
  assert.ok(SUPERVISION_HISTORY_HOUR_TYPES.includes(PracticeLevel.PRACTICE));
  assert.equal(
    isLegacySupervisionHistoryRecord([{ type: PracticeLevel.PRACTICE }]),
    true,
  );
  assert.deepEqual(
    aggregateSupervisionHistoryHours([{ type: PracticeLevel.PRACTICE, value: 40 }]),
    { implementing: 20, programming: 20, mentor: 0 },
  );
});

test('preserves modern application subtypes in history', () => {
  assert.equal(
    isLegacySupervisionHistoryRecord([{ type: PracticeLevel.IMPLEMENTING }]),
    false,
  );
  assert.deepEqual(
    aggregateSupervisionHistoryHours([
      { type: PracticeLevel.IMPLEMENTING, value: 12 },
      { type: PracticeLevel.PROGRAMMING, value: 18 },
    ]),
    { implementing: 12, programming: 18, mentor: 0 },
  );
});

test('keeps processed legacy mentorship applications visible', () => {
  assert.ok(SUPERVISION_HISTORY_HOUR_TYPES.includes(PracticeLevel.SUPERVISION));
  assert.equal(
    isLegacySupervisionHistoryRecord([{ type: PracticeLevel.SUPERVISION }]),
    true,
  );
  assert.deepEqual(
    aggregateSupervisionHistoryHours([
      { type: PracticeLevel.SUPERVISION, value: 3 },
    ]),
    { implementing: 0, programming: 0, mentor: 3 },
  );
});
