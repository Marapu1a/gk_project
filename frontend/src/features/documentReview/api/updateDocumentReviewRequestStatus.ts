import { api } from '@/lib/axios';

interface UpdateStatusInput {
  id: string;
  status: 'CONFIRMED' | 'REJECTED';
  comment?: string;
}

export async function updateDocumentReviewRequestStatus({ id, status, comment }: UpdateStatusInput) {
  const body: any = { status };
  if (comment !== undefined) body.comment = comment;

  const res = await api.patch(`/admin/document-review/requests/${id}/status`, body);
  return res.data;
}

