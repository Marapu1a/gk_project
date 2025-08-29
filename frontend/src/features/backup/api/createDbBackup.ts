// src/features/backup/api/createDbBackup.ts
import { api } from '@/lib/axios';

export type CreateDbBackupResult = { ok: true; file: string; path?: string };

export async function createDbBackup(): Promise<CreateDbBackupResult> {
  const { data } = await api.post<CreateDbBackupResult>('/admin/db/backup');
  return data;
}
