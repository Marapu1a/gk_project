import { api } from '@/lib/axios';

export async function getDocumentReviewRequest() {
  const res = await api.get('/document-review/request');
  return res.data;
}
