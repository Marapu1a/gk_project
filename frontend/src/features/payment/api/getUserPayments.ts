import { api } from '@/lib/axios';

export interface PaymentItem {
  id: string;
  userId: string;
  user?: { email: string };
  type: 'DOCUMENT_REVIEW' | 'EXAM_ACCESS' | 'REGISTRATION' | 'FULL_PACKAGE';
  status: 'UNPAID' | 'PENDING' | 'PAID';
  comment: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export async function getUserPayments(): Promise<PaymentItem[]> {
  const res = await api.get<PaymentItem[]>('/payment'); // /payment возвращает user.email (мы добавили в select)
  return res.data;
}
