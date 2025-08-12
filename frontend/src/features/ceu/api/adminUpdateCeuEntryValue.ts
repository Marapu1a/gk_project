// src/features/ceu/api/adminUpdateCeuEntryValue.ts
import { api } from '@/lib/axios';

export async function adminUpdateCeuEntryValue(entryId: string, value: number) {
  await api.patch(`/admin/ceu/entries/${entryId}`, { value });
}
