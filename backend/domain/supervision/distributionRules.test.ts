import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDistributionPracticeLinkError,
  getSupervisionDistributionError,
} from './distributionRules';

test('allows no more than half of fractional supervision to be group supervision', () => {
  assert.equal(
    getSupervisionDistributionError({
      expectedSupervision: 1,
      distribution: {
        directIndividual: 0.5,
        directGroup: 0.5,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
    }),
    null,
  );
});

test('keeps the 50 percent group limit from the first fractional hour', () => {
  assert.match(
    getSupervisionDistributionError({
      expectedSupervision: 1,
      distribution: {
        directIndividual: 0.4,
        directGroup: 0.6,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
    }) ?? '',
    /не более 50%/,
  );
});

test('counts previous requests when applying the fractional group limit', () => {
  assert.match(
    getSupervisionDistributionError({
      expectedSupervision: 0.7,
      baseSupervision: 1.3,
      baseGroup: 0.6,
      distribution: {
        directIndividual: 0.2,
        directGroup: 0.5,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
    }) ?? '',
    /не более 50%/,
  );
});

test('rejects distribution sections without their matching practice type', () => {
  assert.match(
    getDistributionPracticeLinkError({
      implementing: 0,
      programming: 10,
      distribution: {
        directIndividual: 1,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
      },
    }) ?? '',
    /полевой практики/,
  );
  assert.equal(
    getDistributionPracticeLinkError({
      implementing: 10,
      programming: 10,
      distribution: {
        directIndividual: 1,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 1,
      },
    }),
    null,
  );
});
