// src/features/supervision/api/submitSupervisionRequest.ts
import { api } from '@/lib/axios';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

export type SubmitSupervisionRequestResponse = {
  success: true;
  recordId: string;
};

export async function submitSupervisionRequest(
  data: SupervisionRequestFormData
): Promise<SubmitSupervisionRequestResponse> {
  const { data: res } = await api.post('/supervision/create', {
    supervisorEmail: data.supervisorEmail,
    entries: data.entries,
  });

  // Унифицируем разные варианты ответа бэка
  const recordId: string | undefined = res?.record?.id ?? res?.recordId;
  if (!recordId) {
    throw new Error('Неверный ответ сервера: нет recordId');
  }
  return { success: true, recordId };
}
