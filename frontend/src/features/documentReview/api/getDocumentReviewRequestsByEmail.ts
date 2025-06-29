import { api } from '@/lib/axios';

export async function getDocumentReviewRequestsByEmail(email: string) {
  const res = await api.get(`/admin/document-review/requests/by-email/${encodeURIComponent(email)}`);
  return res.data;
}
