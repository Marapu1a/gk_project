// src/features/supervision/api/submitSupervisionRequest.ts
import { api } from '@/lib/axios';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

export async function submitSupervisionRequest(data: SupervisionRequestFormData): Promise<void> {
  await api.post('/supervision/create', {
    fileId: data.fileId,
    supervisorEmail: data.supervisorEmail,
    entries: data.entries,
  });
}
