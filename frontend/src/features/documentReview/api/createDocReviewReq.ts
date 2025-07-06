import { api } from '@/lib/axios';

type CreateDocReviewReqPayload = {
  fileIds: string[];
  comment?: string;
};

export async function createDocReviewReq(data: CreateDocReviewReqPayload) {
  const res = await api.post('/document-review-request', data);
  return res.data;
}
