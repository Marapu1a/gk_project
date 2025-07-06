import { api } from '@/lib/axios';

export async function updateDocReviewRequestPaid(id: string, paid: boolean) {
  const res = await api.patch(`/document-review-requests/${id}/paid`, { paid });
  return res.data;
}
