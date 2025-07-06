import { api } from '@/lib/axios';

export async function getAllDocReviewRequests(email?: string) {
  const res = await api.get('/document-review-requests', {
    params: email ? { email } : {},
  });
  return res.data;
}
