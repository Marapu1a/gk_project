import { api } from '@/lib/axios';

export async function markDocumentReviewRequestPaid({
  id,
  paid,
}: {
  id: string;
  paid: boolean;
}) {
  const res = await api.post(`/admin/document-review/request/${id}/pay`, { paid });
  return res.data;
}
