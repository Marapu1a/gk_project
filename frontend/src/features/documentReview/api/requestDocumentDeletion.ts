import { api } from '@/lib/axios';

export async function requestDocumentDeletion(fileReviewId: string, comment: string) {
  const res = await api.post(`/document-review-request/files/${fileReviewId}/deletion-request`, {
    comment,
  });
  return res.data;
}
