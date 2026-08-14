import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCumulativePracticeBalanceError,
  getPracticeBalanceLimits,
  isPracticeBalanceComplete,
  resolveCumulativePracticeBalance,
  resolveCumulativePracticeDistribution,
  splitNeutralPracticeHours,
} from './practiceBalance';

test('derives the 40/40/20 limits from the cycle requirement', () => {
  assert.deepEqual(getPracticeBalanceLimits(1500), { minimumEach: 600, maximumEach: 900 });
  assert.deepEqual(getPracticeBalanceLimits(300), { minimumEach: 120, maximumEach: 180 });
});

test('allows unbalanced individual requests while the cycle can still be completed', () => {
  assert.equal(
    getCumulativePracticeBalanceError({
      requiredPractice: 1500,
      current: { implementing: 0, programming: 0 },
      added: { implementing: 750, programming: 0 },
    }),
    null,
  );
});

test('rejects only the type that would consume the mandatory reserve', () => {
  assert.match(
    getCumulativePracticeBalanceError({
      requiredPractice: 1500,
      current: { implementing: 750, programming: 0 },
      added: { implementing: 151, programming: 0 },
    }) ?? '',
    /не более 900/,
  );
  assert.equal(
    getCumulativePracticeBalanceError({
      requiredPractice: 1500,
      current: { implementing: 750, programming: 0 },
      added: { implementing: 0, programming: 600 },
    }),
    null,
  );
});

test('requires both minimums for the completed cycle', () => {
  assert.equal(
    isPracticeBalanceComplete({
      requiredPractice: 1500,
      current: { implementing: 900, programming: 600 },
    }),
    true,
  );
  assert.equal(
    isPracticeBalanceComplete({
      requiredPractice: 1500,
      current: { implementing: 950, programming: 550 },
    }),
    false,
  );
});

test('keeps legacy and bonus hours neutral without changing their total', () => {
  assert.deepEqual(splitNeutralPracticeHours(500.01), {
    implementing: 250.01,
    programming: 250,
  });
});

test('uses confirmed and pending hours together with a neutral bonus', () => {
  assert.deepEqual(
    resolveCumulativePracticeBalance({
      confirmed: { implementing: 500, programming: 400 },
      pending: { implementing: 100, programming: 50 },
      neutralBonus: 500,
    }),
    { implementing: 850, programming: 700 },
  );
});

test('uses an admin correction as a baseline and adds later confirmed and pending hours', () => {
  assert.deepEqual(
    resolveCumulativePracticeBalance({
      confirmed: { implementing: 400, programming: 0 },
      correction: { implementing: 4, programming: 6 },
      pending: { implementing: 25, programming: 75 },
      neutralBonus: 0,
    }),
    { implementing: 429, programming: 81 },
  );
});

test('adds supervision distribution confirmed after an admin correction', () => {
  assert.deepEqual(
    resolveCumulativePracticeDistribution({
      correction: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
      added: {
        directIndividual: 20,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
    }),
    {
      directIndividual: 20,
      directGroup: 0,
      nonObservingIndividual: 0,
      nonObservingGroup: 0,
    },
  );
});

test('preserves every distribution bucket when later confirmations are added', () => {
  assert.deepEqual(
    resolveCumulativePracticeDistribution({
      correction: {
        directIndividual: 2,
        directGroup: 1,
        nonObservingIndividual: 3,
        nonObservingGroup: 0,
      },
      added: {
        directIndividual: 1,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 1,
      },
    }),
    {
      directIndividual: 3,
      directGroup: 1,
      nonObservingIndividual: 3,
      nonObservingGroup: 1,
    },
  );
});

test('rounds floating point artifacts before deciding that the cycle is complete', () => {
  assert.equal(
    isPracticeBalanceComplete({
      requiredPractice: 1500,
      current: { implementing: 600 - Number.EPSILON, programming: 900 },
    }),
    true,
  );
});
