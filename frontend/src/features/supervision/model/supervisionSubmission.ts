import type { QueryClient } from '@tanstack/react-query';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';
import { supervisionSummaryQueryKey } from '../hooks/useSupervisionSummary';
import type { SupervisionDistribution } from './hourCalculations';

export function buildPracticeHoursSubmission(input: {
  supervisorEmail: string;
  supervisionDate: string;
  periodStartedAt: string;
  periodEndedAt: string;
  treatmentSetting: string;
  description: string;
  ethicsAccepted: boolean;
  distribution: SupervisionDistribution;
  implementing: number;
  programming: number;
}): SupervisionRequestFormData {
  return {
    supervisorEmail: input.supervisorEmail,
    supervisionDate: input.supervisionDate || undefined,
    periodStartedAt: input.periodStartedAt || undefined,
    periodEndedAt: input.periodEndedAt || undefined,
    treatmentSetting: input.treatmentSetting.trim() || undefined,
    description: input.description.trim() || undefined,
    ethicsAccepted: input.ethicsAccepted,
    draftDistribution: input.distribution,
    entries: [
      { type: 'IMPLEMENTING' as const, value: input.implementing },
      { type: 'PROGRAMMING' as const, value: input.programming },
    ].filter((entry) => entry.value > 0),
  };
}

export function buildMentorshipHoursSubmission(input: {
  mentorEmail: string;
  mentorshipDate: string;
  format: string;
  comment: string;
  ethicsAccepted: boolean;
  hours: number;
}): SupervisionRequestFormData {
  return {
    supervisorEmail: input.mentorEmail,
    periodStartedAt: input.mentorshipDate,
    periodEndedAt: input.mentorshipDate,
    treatmentSetting: input.format,
    description: input.comment.trim() || undefined,
    ethicsAccepted: input.ethicsAccepted,
    entries: [{ type: 'SUPERVISOR', value: input.hours }],
  };
}

export async function invalidateSupervisionSubmissionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['supervision', 'history'] }),
    queryClient.invalidateQueries({ queryKey: supervisionSummaryQueryKey }),
    queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
  ]);
}
