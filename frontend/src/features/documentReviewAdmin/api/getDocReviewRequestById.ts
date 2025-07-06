import { api } from '@/lib/axios';

export async function getDocReviewRequestById(id?: string) {
  if (!id) return null;

  const res = await api.get(`/document-review-requests/${id}`);
  return res.data;
}
