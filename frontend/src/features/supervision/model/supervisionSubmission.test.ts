import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { supervisionSummaryQueryKey } from '../hooks/useSupervisionSummary';
import {
  buildMentorshipHoursSubmission,
  buildPracticeHoursSubmission,
  invalidateSupervisionSubmissionQueries,
} from './supervisionSubmission';

describe('supervision submission', () => {
  it('builds a practice request and omits empty hour entries', () => {
    expect(
      buildPracticeHoursSubmission({
        supervisorEmail: 'supervisor@example.com',
        supervisionDate: '2026-07-10',
        periodStartedAt: '2026-07-01',
        periodEndedAt: '2026-07-10',
        treatmentSetting: '  Клиника  ',
        description: '  Отчёт за период  ',
        ethicsAccepted: true,
        distribution: {
          directIndividual: 1,
          directGroup: 0,
          nonObservingIndividual: 1,
          nonObservingGroup: 0,
        },
        implementing: 10,
        programming: 0,
      }),
    ).toEqual({
      supervisorEmail: 'supervisor@example.com',
      supervisionDate: '2026-07-10',
      periodStartedAt: '2026-07-01',
      periodEndedAt: '2026-07-10',
      treatmentSetting: 'Клиника',
      description: 'Отчёт за период',
      ethicsAccepted: true,
      draftDistribution: {
        directIndividual: 1,
        directGroup: 0,
        nonObservingIndividual: 1,
        nonObservingGroup: 0,
      },
      entries: [{ type: 'IMPLEMENTING', value: 10 }],
    });
  });

  it('builds mentorship as one supervisor entry for a single calendar day', () => {
    expect(
      buildMentorshipHoursSubmission({
        mentorEmail: 'mentor@example.com',
        mentorshipDate: '2026-07-12',
        format: 'Дистанционно / онлайн',
        comment: '  Разбор случая  ',
        ethicsAccepted: true,
        hours: 2.5,
      }),
    ).toEqual({
      supervisorEmail: 'mentor@example.com',
      periodStartedAt: '2026-07-12',
      periodEndedAt: '2026-07-12',
      treatmentSetting: 'Дистанционно / онлайн',
      description: 'Разбор случая',
      ethicsAccepted: true,
      entries: [{ type: 'SUPERVISOR', value: 2.5 }],
    });
  });

  it('invalidates history, summary and current user after submission', async () => {
    const queryClient = new QueryClient();
    const affectedKeys = [
      ['supervision', 'history'] as const,
      supervisionSummaryQueryKey,
      currentUserQueryKey,
    ] as const;
    const unrelatedKey = ['supervision', 'reviewerCandidates'] as const;

    [...affectedKeys, unrelatedKey].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, { loaded: true });
    });

    await invalidateSupervisionSubmissionQueries(queryClient);

    affectedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    });
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
