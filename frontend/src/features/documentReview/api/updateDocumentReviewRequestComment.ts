import { api } from '@/lib/axios';

interface UpdateCommentInput {
  id: string;
  comment: string;
}

export async function updateDocumentReviewRequestComment({ id, comment }: UpdateCommentInput) {
  const res = await api.patch(`/admin/document-review/requests/${id}/comment`, { comment });
  return res.data;
}
