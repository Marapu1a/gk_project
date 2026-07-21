import { RecordStatus } from '@prisma/client';

export type CeuReviewTransitionError =
  | 'CEU_SPENT_IRREVERSIBLE'
  | 'CEU_REJECTION_IRREVERSIBLE';

export function getCeuReviewTransitionError(
  currentStatuses: RecordStatus[],
): CeuReviewTransitionError | null {
  if (currentStatuses.includes(RecordStatus.SPENT)) return 'CEU_SPENT_IRREVERSIBLE';
  if (currentStatuses.includes(RecordStatus.REJECTED)) return 'CEU_REJECTION_IRREVERSIBLE';
  return null;
}
