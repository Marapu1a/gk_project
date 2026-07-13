import type { QueryClient } from '@tanstack/react-query';
import type { CeuRequestFormData } from '../validation/ceuRequestSchema';
import { ceuSummaryQueryKey } from '../hooks/useCeuSummary';

export type CeuActivityType = CeuRequestFormData['entries'][number]['activityType'];
export type CeuCategory = CeuRequestFormData['entries'][number]['category'];
export type CeuSubmissionEntry = { category: CeuCategory; value: number };

export type CeuSubmissionValidationError =
  | 'POINTS_REQUIRED'
  | 'STEP_INVALID'
  | 'ACTIVITY_TYPE_REQUIRED'
  | 'EVENT_DATE_REQUIRED'
  | 'EVENT_DATE_IN_FUTURE'
  | 'EVENT_NAME_REQUIRED'
  | 'FILE_REQUIRED';

type CeuSubmissionDraft = {
  eventName: string;
  eventDate: string;
  activityType: CeuActivityType | '';
  entries: CeuSubmissionEntry[];
  hasFile: boolean;
};

function isHalfStep(value: number) {
  return Math.abs(value * 2 - Math.round(value * 2)) < 0.001;
}

export function getCeuSubmissionValidationError(
  draft: CeuSubmissionDraft,
  today: string,
): CeuSubmissionValidationError | null {
  if (draft.entries.length === 0 || draft.entries.some((entry) => entry.value <= 0)) {
    return 'POINTS_REQUIRED';
  }
  if (draft.entries.some((entry) => !isHalfStep(entry.value))) return 'STEP_INVALID';
  if (!draft.activityType) return 'ACTIVITY_TYPE_REQUIRED';
  if (!draft.eventDate) return 'EVENT_DATE_REQUIRED';
  if (draft.eventDate > today) return 'EVENT_DATE_IN_FUTURE';
  if (!draft.eventName.trim()) return 'EVENT_NAME_REQUIRED';
  if (!draft.hasFile) return 'FILE_REQUIRED';
  return null;
}

export function buildCeuSubmissionPayload(input: {
  eventName: string;
  eventDate: string;
  fileId: string;
  activityType: CeuActivityType;
  entries: CeuSubmissionEntry[];
}): CeuRequestFormData {
  return {
    eventName: input.eventName.trim(),
    eventDate: input.eventDate,
    fileId: input.fileId,
    activityType: input.activityType,
    entries: input.entries.map((entry) => ({
      ...entry,
      activityType: input.activityType,
    })),
  };
}

export async function invalidateCeuSubmissionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ceuSummaryQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['ceu', 'history'] }),
    queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] }),
  ]);
}
