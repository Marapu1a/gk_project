// src/features/admin/api/updateUserSupervisionMatrix.ts
import { api } from '@/lib/axios';
import type { SupervisionLevel, SupervisionStatus } from './getUserSupervisionMatrix';

export type UpdateUserSupervisionMatrixBody = {
  level: SupervisionLevel; // PRACTICE | SUPERVISION | SUPERVISOR
  status: SupervisionStatus; // CONFIRMED | UNCONFIRMED
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
  body: UpdateUserSupervisionMatrixBody
): Promise<UpdateUserSupervisionMatrixResponse> {
  const { data } = await api.patch<UpdateUserSupervisionMatrixResponse>(
    `/admin/supervision/${userId}/matrix`,
    body
  );
  return data;
}
