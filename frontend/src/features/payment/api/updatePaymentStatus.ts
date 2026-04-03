import { api } from '@/lib/axios';
import type { PaymentStatus } from './getUserPayments';

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  comment?: string,
) {
  await api.patch(`/payment/${id}`, { status, comment });
}
