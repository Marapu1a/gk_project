import { api } from '@/lib/axios';
import type { ExamApp, ExamStatus } from './getMyExamApp';

export async function patchExamAppStatus(userId: string, status: ExamStatus, opts?: {
  comment?: string;
  notify?: boolean;
}) {
  const res = await api.patch(`/exam-applications/${userId}/status`, {
    status,
    ...opts,
  });
  return res.data as ExamApp;
}
