// src/features/admin/api/getUserCEUMatrix.ts
import { api } from '@/lib/axios';

export type CEUCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
export type CEUStatus = 'CONFIRMED' | 'SPENT' | 'REJECTED';

export type CEUMatrixResponse = {
  user: { id: string; email: string; fullName: string };
  matrix: Record<CEUCategory, Record<CEUStatus, number>>;
};

export async function getUserCEUMatrix(userId: string): Promise<CEUMatrixResponse> {
  const res = await api.get(`/admin/ceu/${userId}/matrix`);
  return res.data;
}
