import { api } from '@/lib/axios';

interface CreateDocumentReviewRequestInput {
  documentDetails: {
    fileId: string;
    type: string;
    comment?: string;
  }[];
}

export async function createDocumentReviewRequest(input: CreateDocumentReviewRequestInput) {
  const res = await api.post('/document-review/request', input);
  return res.data;
}
