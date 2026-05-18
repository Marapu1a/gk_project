import { api } from '@/lib/axios';

export type DocumentReviewFileStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'DELETED';

export type UpdateDocumentReviewFilePayload = {
  status?: DocumentReviewFileStatus;
  type?: string | null;
  adminComment?: string | null;
};

export async function updateDocumentReviewFile(
  requestId: string,
  fileReviewId: string,
  payload: UpdateDocumentReviewFilePayload,
) {
  const res = await api.patch(
    `/document-review-requests/${requestId}/files/${fileReviewId}`,
    payload,
  );
  return res.data;
}

export async function deleteDocumentReviewFile(requestId: string, fileReviewId: string) {
  const res = await api.delete(`/document-review-requests/${requestId}/files/${fileReviewId}`);
  return res.data;
}
