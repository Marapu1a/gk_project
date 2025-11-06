// src/features/supervision/api/submitSupervisionRequest.ts
import { api } from '@/lib/axios';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

// Ответ бэка
export type SubmitSupervisionRequestResponse = {
  success: true;
  recordId: string;
};

// нормализация legacy типов перед отправкой
function normalizeType(t: string): string {
  if (t === 'INSTRUCTOR') return 'PRACTICE';
  if (t === 'CURATOR') return 'SUPERVISION';
  return t;
}

export async function submitSupervisionRequest(
  data: SupervisionRequestFormData
): Promise<SubmitSupervisionRequestResponse> {
  const payload = {
    supervisorEmail: data.supervisorEmail,
    entries: data.entries.map((e) => ({
      ...e,
      type: normalizeType(e.type),
    })),
  };

  const { data: res } = await api.post('/supervision/create', payload);

  const recordId: string | undefined = res?.record?.id ?? res?.recordId;
  if (!recordId) throw new Error('Неверный ответ сервера: нет recordId');

  return { success: true, recordId };
}
