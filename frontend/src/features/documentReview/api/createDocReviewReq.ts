import type { DocumentType } from '@/utils/documentTypeLabels';
import { api } from '@/lib/axios';

type CreateDocReviewReqPayload = {
  documents: Array<{
    fileId: string;
    type: DocumentType;
  }>;
  comment?: string;
};

export async function createDocReviewReq(data: CreateDocReviewReqPayload) {
  const res = await api.post('/document-review-request', data);
  return res.data;
}
