import { api } from '@/lib/axios';

export interface PaymentItem {
  userId: any;
  id: string;
  type: 'DOCUMENT_REVIEW' | 'EXAM_ACCESS' | 'REGISTRATION' | 'FULL_PACKAGE';
  status: 'UNPAID' | 'PENDING' | 'PAID';
  comment: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export async function getUserPayments(): Promise<PaymentItem[]> {
  const res = await api.get<PaymentItem[]>('/payment');
  return res.data;
}
