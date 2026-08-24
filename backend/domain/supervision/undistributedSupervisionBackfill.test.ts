import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_SUPERVISION_DISTRIBUTION,
  planUndistributedSupervisionAllocation,
} from './undistributedSupervisionBackfill';

test('puts a fully undistributed total into non-observing individual supervision', () => {
  assert.deepEqual(
    planUndistributedSupervisionAllocation({
      calculatedSupervision: 19.2,
      confirmedRecordDistribution: EMPTY_SUPERVISION_DISTRIBUTION,
      legacyDistribution: null,
      hasAdminCorrection: false,
    }),
    {
      strategy: 'LEGACY_DISTRIBUTION',
      remainder: 19.2,
      effectiveBefore: EMPTY_SUPERVISION_DISTRIBUTION,
      effectiveAfter: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 19.2,
        nonObservingGroup: 0,
      },
    },
  );
});

test('preserves an existing confirmed distribution and adds only its remainder', () => {
  assert.deepEqual(
    planUndistributedSupervisionAllocation({
      calculatedSupervision: 6.3,
      confirmedRecordDistribution: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 1,
        nonObservingGroup: 0,
      },
      legacyDistribution: null,
      hasAdminCorrection: false,
    }),
    {
      strategy: 'CONFIRMED_RECORD',
      remainder: 5.3,
      effectiveBefore: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 1,
        nonObservingGroup: 0,
      },
      effectiveAfter: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 6.3,
        nonObservingGroup: 0,
      },
    },
  );
});

test('does nothing when supervision is already fully distributed', () => {
  assert.equal(
    planUndistributedSupervisionAllocation({
      calculatedSupervision: 2,
      confirmedRecordDistribution: EMPTY_SUPERVISION_DISTRIBUTION,
      legacyDistribution: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 2,
        nonObservingGroup: 0,
      },
      hasAdminCorrection: false,
    }),
    null,
  );
});

test('refuses to layer the backfill over an admin correction', () => {
  assert.throws(
    () =>
      planUndistributedSupervisionAllocation({
        calculatedSupervision: 5,
        confirmedRecordDistribution: EMPTY_SUPERVISION_DISTRIBUTION,
        legacyDistribution: null,
        hasAdminCorrection: true,
      }),
    /админской корректировки/,
  );
});
