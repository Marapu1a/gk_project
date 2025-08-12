// src/features/supervision/api/adminUpdateSupervisionHourValue.ts
import { api } from '@/lib/axios';

export async function adminUpdateSupervisionHourValue(id: string, value: number) {
  await api.patch(`/admin/supervision-hour/${id}`, { value });
}
