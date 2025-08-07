import { api } from '@/lib/axios';

export async function updatePaymentStatus(id: string, status: 'UNPAID' | 'PENDING' | 'PAID', comment?: string) {
  await api.patch(`/payment/${id}`, { status, comment });
}
