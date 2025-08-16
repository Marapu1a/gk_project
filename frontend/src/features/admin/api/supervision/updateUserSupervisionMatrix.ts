// src/features/admin/api/updateUserSupervisionMatrix.ts
import { api } from '@/lib/axios';
import type { SupervisionLevel, SupervisionStatus } from './getUserSupervisionMatrix';

export type UpdateUserSupervisionMatrixBody = {
  level: SupervisionLevel;
  status: SupervisionStatus;
  value: number;
};

export type UpdateUserSupervisionMatrixResponse = {
  ok: true;
  level: SupervisionLevel;
  status: SupervisionStatus;
  newValue: number;
  unchanged?: true;
  current?: number;
};

export async function updateUserSupervisionMatrix(
  userId: string,
  data: UpdateUserSupervisionMatrixBody
): Promise<UpdateUserSupervisionMatrixResponse> {
  const res = await api.patch(`/admin/supervision/${userId}/matrix`, data);
  return res.data;
}
