// src/features/admin/api/getUserSupervisionMatrix.ts
import { api } from '@/lib/axios';

export type SupervisionLevel = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
export type SupervisionStatus = 'CONFIRMED' | 'UNCONFIRMED';

export type AdminSupervisionSummary = {
  required: { practice: number; supervision: number; supervisor: number } | null;
  percent: { practice: number; supervision: number; supervisor: number } | null;
  usable: { practice: number; supervision: number; supervisor: number };
  pending: { practice: number; supervision: number; supervisor: number };
  mentor: { total: number; required: number; percent: number; pending: number } | null;
  bonus?: { practice: number; fromCycleId: string | null } | null;
  practiceBreakdown?: {
    total: number;
    legacy: number;
    implementing: number;
    programming: number;
    bonus: number;
  };
  supervisionBreakdown?: {
    total: number;
    direct: number;
    nonObserving: number;
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
    distributedTotal: number;
    remaining: number;
  };
};

export type SupervisionMatrixResponse = {
  user: { id: string; email: string; fullName: string };
  matrix: Record<SupervisionLevel, Record<SupervisionStatus, number>>;
  summary: AdminSupervisionSummary;
};

export async function getUserSupervisionMatrix(
  userId: string
): Promise<SupervisionMatrixResponse> {
  const { data } = await api.get<SupervisionMatrixResponse>(`/admin/supervision/${userId}/matrix`);
  return data; // бэк уже отдаёт PRACTICE/SUPERVISION/SUPERVISOR
}
