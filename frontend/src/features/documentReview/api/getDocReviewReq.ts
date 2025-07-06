import { api } from '@/lib/axios';

export async function getDocReviewReq() {
  const res = await api.get('/document-review-request');
  return res.data;
}
