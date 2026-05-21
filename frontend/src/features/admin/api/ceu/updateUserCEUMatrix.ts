// src/features/admin/api/updateUserCEUMatrix.ts
import { api } from '@/lib/axios';
import type { CEUCategory, CEUStatus } from './getUserCEUMatrix';

export type UpdateUserCEUMatrixBody = {
  category: CEUCategory;
  status: CEUStatus;
  value: number;
  notifyUser?: boolean;
};

export type UpdateUserCEUMatrixResponse = {
  ok: true;
  category: CEUCategory;
  status: CEUStatus;
  newValue: number;
  notified?: boolean;
};

export async function updateUserCEUMatrix(
  userId: string,
  data: UpdateUserCEUMatrixBody
): Promise<UpdateUserCEUMatrixResponse> {
  const res = await api.patch(`/admin/ceu/${userId}/matrix`, data);
  return res.data;
}
