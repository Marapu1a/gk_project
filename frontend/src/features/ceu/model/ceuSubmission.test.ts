import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ceuSummaryQueryKey } from '../hooks/useCeuSummary';
import {
  buildCeuSubmissionPayload,
  getCeuSubmissionValidationError,
  invalidateCeuSubmissionQueries,
} from './ceuSubmission';

const validDraft = {
  eventName: '  Курс по этике  ',
  eventDate: '2026-07-12',
  activityType: 'TRAINING_ATTENDANCE' as const,
  entries: [{ category: 'ETHICS' as const, value: 1.5 }],
  hasFile: true,
};

describe('CEU submission', () => {
  it('accepts half-step points and builds the API payload', () => {
    expect(getCeuSubmissionValidationError(validDraft, '2026-07-13')).toBeNull();
    expect(
      buildCeuSubmissionPayload({
        ...validDraft,
        fileId: 'file-1',
      }),
    ).toEqual({
      eventName: 'Курс по этике',
      eventDate: '2026-07-12',
      fileId: 'file-1',
      activityType: 'TRAINING_ATTENDANCE',
      entries: [
        { category: 'ETHICS', value: 1.5, activityType: 'TRAINING_ATTENDANCE' },
      ],
    });
  });

  it('rejects invalid points and future events before upload', () => {
    expect(
      getCeuSubmissionValidationError(
        { ...validDraft, entries: [{ category: 'ETHICS', value: 1.25 }] },
        '2026-07-13',
      ),
    ).toBe('STEP_INVALID');
    expect(
      getCeuSubmissionValidationError({ ...validDraft, eventDate: '2026-07-14' }, '2026-07-13'),
    ).toBe('EVENT_DATE_IN_FUTURE');
  });

  it('invalidates every CEU view after a successful submission', async () => {
    const queryClient = new QueryClient();
    const affectedKeys = [
      ceuSummaryQueryKey,
      ['ceu', 'history'] as const,
      ['ceu', 'unconfirmed'] as const,
    ] as const;
    const unrelatedKey = ['ceu', 'review', 'user@example.com'] as const;

    [...affectedKeys, unrelatedKey].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, { loaded: true });
    });

    await invalidateCeuSubmissionQueries(queryClient);

    affectedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    });
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
