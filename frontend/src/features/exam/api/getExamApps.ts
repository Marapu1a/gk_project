import { api } from '@/lib/axios';
import type { ExamApp } from './getMyExamApp';

export async function getExamApps() {
  const res = await api.get('/exam-applications');
  return res.data as ExamApp[]; // фильтруем на фронте
}
