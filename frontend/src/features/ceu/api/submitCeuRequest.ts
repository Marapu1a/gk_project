// src/features/ceu/api/submitCeuRequest.ts
import { api } from '@/lib/axios';
import type { CeuRequestFormData } from '../validation/ceuRequestSchema';

type SubmitCeuResponse = {
  success: boolean;
  submittedBy: string;
};

export async function submitCeuRequest(data: CeuRequestFormData): Promise<SubmitCeuResponse> {
  const res = await api.post('/ceu/create', {
    eventName: data.eventName,
    eventDate: data.eventDate,
    fileId: data.fileId,
    entries: data.entries,
  });

  return res.data;
}
