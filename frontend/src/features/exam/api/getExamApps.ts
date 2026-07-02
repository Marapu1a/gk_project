import { api } from '@/lib/axios';
import type { ExamApp } from './getMyExamApp';

export async function getExamApps(search = '') {
  const res = await api.get('/exam-applications', {
    params: search.trim() ? { search: search.trim() } : undefined,
  });
  return res.data as ExamApp[];
}
