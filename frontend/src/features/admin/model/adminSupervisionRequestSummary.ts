import type {
  AdminReviewerCandidateRow,
  AdminReviewerHourStatus,
} from '@/features/admin/api/supervision/getAdminReviewerCandidates';

export type AdminSupervisionRequest = AdminReviewerCandidateRow['requests'][number];

export type AdminSupervisionRequestState =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'SPENT'
  | 'MIXED';

export type AdminSupervisionRequestsSummary = {
  totalRequests: number;
  totalHours: number;
  confirmedRequests: number;
  confirmedHours: number;
  pendingRequests: number;
  pendingHours: number;
  rejectedRequests: number;
  rejectedHours: number;
  otherRequests: number;
  otherHours: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function supervisionRequestHours(request: AdminSupervisionRequest) {
  return round2(request.hours.reduce((sum, hour) => sum + Number(hour.value || 0), 0));
}

export function supervisionRequestState(
  request: AdminSupervisionRequest,
): AdminSupervisionRequestState {
  const statuses = new Set<AdminReviewerHourStatus>(request.hours.map((hour) => hour.status));

  if (statuses.has('UNCONFIRMED')) return 'PENDING';
  if (statuses.size === 1 && statuses.has('CONFIRMED')) return 'CONFIRMED';
  if (statuses.size === 1 && statuses.has('REJECTED')) return 'REJECTED';
  if (statuses.size === 1 && statuses.has('SPENT')) return 'SPENT';
  return 'MIXED';
}

export function summarizeSupervisionRequests(
  requests: AdminSupervisionRequest[],
): AdminSupervisionRequestsSummary {
  const summary: AdminSupervisionRequestsSummary = {
    totalRequests: 0,
    totalHours: 0,
    confirmedRequests: 0,
    confirmedHours: 0,
    pendingRequests: 0,
    pendingHours: 0,
    rejectedRequests: 0,
    rejectedHours: 0,
    otherRequests: 0,
    otherHours: 0,
  };

  for (const request of requests) {
    const hours = supervisionRequestHours(request);
    const state = supervisionRequestState(request);
    summary.totalRequests += 1;
    summary.totalHours += hours;

    if (state === 'CONFIRMED') {
      summary.confirmedRequests += 1;
      summary.confirmedHours += hours;
    } else if (state === 'PENDING') {
      summary.pendingRequests += 1;
      summary.pendingHours += hours;
    } else if (state === 'REJECTED') {
      summary.rejectedRequests += 1;
      summary.rejectedHours += hours;
    } else {
      summary.otherRequests += 1;
      summary.otherHours += hours;
    }
  }

  summary.totalHours = round2(summary.totalHours);
  summary.confirmedHours = round2(summary.confirmedHours);
  summary.pendingHours = round2(summary.pendingHours);
  summary.rejectedHours = round2(summary.rejectedHours);
  summary.otherHours = round2(summary.otherHours);
  return summary;
}
