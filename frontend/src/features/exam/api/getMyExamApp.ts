import { api } from '@/lib/axios';

export type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ExamApp = {
  id: string;
  userId: string;
  cycleId: string | null;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
  cycle?: {
    id: string;
    type: 'CERTIFICATION' | 'RENEWAL';
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
    startedAt: string;
  } | null;
  user: {
    email: string;
    fullName: string;
  };
};

export async function getMyExamApp() {
  const res = await api.get('/exam-applications/me');
  return res.data as ExamApp;
}
