import { api } from '@/lib/axios';

export async function getAllDocReviewRequests(search?: string) {
  const res = await api.get('/document-review-requests', {
    params: search ? { search } : {},
  });
  return res.data;
}
