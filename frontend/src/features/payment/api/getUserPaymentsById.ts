// src/features/payment/api/getUserPaymentsById.ts
import { api } from '@/lib/axios';
import type { PaymentItem } from './getUserPayments';

export async function getUserPaymentsById(userId: string): Promise<PaymentItem[]> {
  const res = await api.get(`/payment/user/${userId}`);
  return res.data;
}
