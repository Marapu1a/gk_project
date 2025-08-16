// src/features/admin/api/getUserSupervisionMatrix.ts
import { api } from '@/lib/axios';

export type SupervisionLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
export type SupervisionStatus = 'CONFIRMED' | 'UNCONFIRMED';

export type SupervisionMatrixResponse = {
  user: { id: string; email: string; fullName: string };
  matrix: Record<SupervisionLevel, Record<SupervisionStatus, number>>;
};

export async function getUserSupervisionMatrix(userId: string): Promise<SupervisionMatrixResponse> {
  const res = await api.get(`/admin/supervision/${userId}/matrix`);
  return res.data;
}
