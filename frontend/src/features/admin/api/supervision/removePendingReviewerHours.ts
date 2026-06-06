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
): Promise<RemovePendingReviewerHoursResponse> {
  const { data } = await api.patch<RemovePendingReviewerHoursResponse>(
    `/admin/supervision/reviewer-candidates/${relationId}/remove-pending`,
    { notifyUser },
  );
  return data;
}
