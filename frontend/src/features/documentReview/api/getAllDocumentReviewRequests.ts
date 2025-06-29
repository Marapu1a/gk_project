import { api } from '@/lib/axios';

export async function getAllDocumentReviewRequests() {
  const res = await api.get('/admin/document-review/requests');
  return res.data;
}
