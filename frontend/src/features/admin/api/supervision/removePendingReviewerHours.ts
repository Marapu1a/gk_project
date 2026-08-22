import { api } from '@/lib/axios';

export type RemovePendingReviewerHoursResponse = {
  success: true;
  notified: boolean;
  removedRecordsCount: number;
  removedHoursCount: number;
};

export async function removePendingReviewerHours(
  relationId: string,
  notifyUser: boolean,
  recordId: string,
): Promise<RemovePendingReviewerHoursResponse> {
  const { data } = await api.patch<RemovePendingReviewerHoursResponse>(
    `/admin/supervision/reviewer-candidates/${encodeURIComponent(relationId)}/requests/${encodeURIComponent(recordId)}/remove-pending`,
    { notifyUser },
  );
  return data;
}
