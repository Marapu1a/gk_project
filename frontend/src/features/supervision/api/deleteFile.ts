// src/features/supervision/api/deleteFile.ts
import { api } from '@/lib/axios';

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/upload/${fileId}`);
}
