// src/features/admin/api/getUserSupervisionMatrix.ts
import { api } from '@/lib/axios';

export type SupervisionLevel = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
export type SupervisionStatus = 'CONFIRMED' | 'UNCONFIRMED';

export type SupervisionMatrixResponse = {
  user: { id: string; email: string; fullName: string };
  matrix: Record<SupervisionLevel, Record<SupervisionStatus, number>>;
};

export async function getUserSupervisionMatrix(
  userId: string
): Promise<SupervisionMatrixResponse> {
  const { data } = await api.get<SupervisionMatrixResponse>(`/admin/supervision/${userId}/matrix`);
  return data; // бэк уже отдаёт PRACTICE/SUPERVISION/SUPERVISOR
}
