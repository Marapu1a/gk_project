export type AdminSupervisionDistributionStatus =
  | 'not-required'
  | 'complete'
  | 'incomplete';

export function getAdminSupervisionDistributionStatus(params: {
  expectedSupervision: number;
  remainingSupervision: number;
}): AdminSupervisionDistributionStatus {
  if (params.expectedSupervision <= 0) return 'not-required';
  if (Math.abs(params.remainingSupervision) < 0.01) return 'complete';
  return 'incomplete';
}
