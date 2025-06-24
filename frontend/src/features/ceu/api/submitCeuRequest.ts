// src/features/ceu/api/submitCeuRequest.ts
import { api } from '@/lib/axios';
import type { CeuRequestFormData } from '../validation/ceuRequestSchema';

export async function submitCeuRequest(data: CeuRequestFormData): Promise<void> {
  await api.post('/ceu/create', {
    eventName: data.eventName,
    eventDate: data.eventDate,
    fileId: data.fileId,
    entries: data.entries,
  });
}
