import { describe, expect, it } from 'vitest';
import { getAdminSupervisionDistributionStatus } from './adminSupervisionDistributionStatus';

describe('getAdminSupervisionDistributionStatus', () => {
  it('does not ask to distribute supervision when none is calculated', () => {
    expect(
      getAdminSupervisionDistributionStatus({
        expectedSupervision: 0,
        remainingSupervision: 0,
      }),
    ).toBe('not-required');
  });

  it('marks a fully distributed calculation as complete', () => {
    expect(
      getAdminSupervisionDistributionStatus({
        expectedSupervision: 5,
        remainingSupervision: 0,
      }),
    ).toBe('complete');
  });

  it('keeps under- and over-distribution in the incomplete state', () => {
    expect(
      getAdminSupervisionDistributionStatus({
        expectedSupervision: 5,
        remainingSupervision: 0.5,
      }),
    ).toBe('incomplete');
    expect(
      getAdminSupervisionDistributionStatus({
        expectedSupervision: 5,
        remainingSupervision: -1,
      }),
    ).toBe('incomplete');
  });
});
