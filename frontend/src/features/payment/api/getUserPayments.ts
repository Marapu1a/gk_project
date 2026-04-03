import { api } from '@/lib/axios';

export type PaymentType =
  | 'DOCUMENT_REVIEW'
  | 'EXAM_ACCESS'
  | 'REGISTRATION'
  | 'FULL_PACKAGE'
  | 'RENEWAL';

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID';

export type PaymentTargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;

export interface PaymentItem {
  id: string;
  userId: string;
  user?: { email: string };
  type: PaymentType;
  targetLevel: PaymentTargetLevel;
  status: PaymentStatus;
  comment: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export async function getUserPayments(): Promise<PaymentItem[]> {
  const res = await api.get<PaymentItem[]>('/payment');
  return res.data;
}
