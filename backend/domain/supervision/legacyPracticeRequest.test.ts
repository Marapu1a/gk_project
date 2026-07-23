import assert from 'node:assert/strict';
import test from 'node:test';
import {
  planLegacyPracticeConversions,
  splitLegacyPractice,
} from './legacyPracticeRequest';

test('splitLegacyPractice preserves the total for fractional hours', () => {
  assert.deepEqual(splitLegacyPractice(0.5), {
    implementing: 0.25,
    programming: 0.25,
  });
});

test('legacy supervision is calculated cumulatively across the cycle', () => {
  const result = planLegacyPracticeConversions({
    confirmedPractice: 0,
    practiceToSupervisionRatio: 20,
    pendingRecords: [
      { id: 'first', practice: 30, shouldConvert: true },
      { id: 'second', practice: 30, shouldConvert: true },
      { id: 'third', practice: 20, shouldConvert: true },
    ],
  });

  assert.deepEqual(
    result.map(({ id, nonObservingIndividual }) => ({ id, nonObservingIndividual })),
    [
      { id: 'first', nonObservingIndividual: 1 },
      { id: 'second', nonObservingIndividual: 2 },
      { id: 'third', nonObservingIndividual: 1 },
    ],
  );
});

test('modern pending records participate in the base but are not converted', () => {
  const result = planLegacyPracticeConversions({
    confirmedPractice: 10,
    practiceToSupervisionRatio: 20,
    pendingRecords: [
      { id: 'modern', practice: 10, shouldConvert: false },
      { id: 'legacy', practice: 20, shouldConvert: true },
    ],
  });

  assert.deepEqual(result, [
    {
      id: 'legacy',
      practice: 20,
      implementing: 10,
      programming: 10,
      nonObservingIndividual: 1,
    },
  ]);
});
