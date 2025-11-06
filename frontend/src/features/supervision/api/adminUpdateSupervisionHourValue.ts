// src/features/supervision/api/adminUpdateSupervisionHourValue.ts
import { api } from '@/lib/axios';

export type SupervisionHourDTO = {
  id: string;
  type: 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' | 'INSTRUCTOR' | 'CURATOR';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
  reviewedAt: string | null;
  rejectedReason: string | null;
  reviewer?: { email: string; fullName: string } | null;
};

export async function adminUpdateSupervisionHourValue(id: string, value: number) {
  if (!id) throw new Error('id обязателен');
  const v = Math.max(0, Math.round(value * 10) / 10); // шаг 0.1

  const { data } = await api.patch<{ success: boolean; updated: SupervisionHourDTO }>(
    `/admin/supervision-hour/${id}`,
    { value: v }
  );

  return data.updated;
}
