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

export async function transferDocumentReviewFileToActiveCycle(
  requestId: string,
  fileReviewId: string,
) {
  const res = await api.post(
    `/document-review-requests/${requestId}/files/${fileReviewId}/transfer-to-active-cycle`,
  );
  return res.data;
}

export async function completeDocumentReviewRequest(requestId: string) {
  const res = await api.post(`/document-review-requests/${requestId}/complete`);
  return res.data;
}

export async function reopenDocumentReviewRequest(requestId: string) {
  const res = await api.post(`/document-review-requests/${requestId}/reopen`);
  return res.data;
}
