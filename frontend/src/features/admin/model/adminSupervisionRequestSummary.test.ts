import { describe, expect, it } from 'vitest';
import type { AdminSupervisionRequest } from './adminSupervisionRequestSummary';
import {
  summarizeSupervisionRequests,
  supervisionRequestHours,
  supervisionRequestState,
} from './adminSupervisionRequestSummary';

function request(
  id: string,
  hours: Array<{ value: number; status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT' }>,
): AdminSupervisionRequest {
  return {
    id,
    source: 'CURRENT',
    createdAt: '2026-08-22T10:00:00.000Z',
    supervisionDate: null,
    periodStartedAt: null,
    periodEndedAt: null,
    treatmentSetting: null,
    description: null,
    distribution: {
      directIndividual: 0,
      directGroup: 0,
      nonObservingIndividual: 0,
      nonObservingGroup: 0,
    },
    hours: hours.map((hour, index) => ({
      id: `${id}-${index}`,
      type: index === 0 ? 'IMPLEMENTING' : 'PROGRAMMING',
      ...hour,
    })),
  };
}

describe('admin supervision request summary', () => {
  it('counts applications separately from their hour rows', () => {
    const confirmed = request('confirmed', [{ value: 80, status: 'CONFIRMED' }]);
    const pending = request('pending', [
      { value: 40, status: 'UNCONFIRMED' },
      { value: 60, status: 'UNCONFIRMED' },
    ]);

    expect(supervisionRequestHours(pending)).toBe(100);
    expect(supervisionRequestState(pending)).toBe('PENDING');
    expect(summarizeSupervisionRequests([confirmed, pending])).toEqual({
      totalRequests: 2,
      totalHours: 180,
      confirmedRequests: 1,
      confirmedHours: 80,
      pendingRequests: 1,
      pendingHours: 100,
      rejectedRequests: 0,
      rejectedHours: 0,
      otherRequests: 0,
      otherHours: 0,
    });
  });

  it('keeps rejected and mixed applications out of confirmed and pending totals', () => {
    const rejected = request('rejected', [{ value: 30, status: 'REJECTED' }]);
    const mixed = request('mixed', [
      { value: 10, status: 'CONFIRMED' },
      { value: 5, status: 'REJECTED' },
    ]);

    expect(supervisionRequestState(mixed)).toBe('MIXED');
    expect(summarizeSupervisionRequests([rejected, mixed])).toMatchObject({
      rejectedRequests: 1,
      rejectedHours: 30,
      otherRequests: 1,
      otherHours: 15,
    });
  });
});
