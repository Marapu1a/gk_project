import { api } from '@/lib/axios';

export async function updateDocReviewRequestStatus(
  id: string,
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED',
  comment?: string
) {
  const res = await api.patch(`/document-review-requests/${id}/status`, { status, comment });
  return res.data;
}
