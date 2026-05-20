import { api } from '@/lib/axios';

export type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ExamApp = {
  id: string;
  userId: string;
  cycleId: string | null;
  status: ExamStatus;
  comment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
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

export type ExamReadinessDetails = {
  application: ExamApp | null;
  readiness: {
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: string;
      currentGroup: { id: string; name: string; rank: number } | null;
    };
    activeCycle: ExamApp['cycle'] | null;
    ceu: {
      ready: boolean;
      current: { ethics: number; cultDiver: number; supervision: number; general: number; total: number };
      required: { ethics: number; cultDiver: number; supervision: number; general: number; total: number } | null;
    };
    supervision: {
      ready: boolean;
      current: { practice: number; supervision: number; mentor: number };
      required: { practice: number; supervision: number; supervisor: number } | null;
    };
    documents: {
      ready: boolean;
      request: {
        id: string;
        status: string;
        submittedAt: string;
        reviewedAt: string | null;
        comment: string | null;
        adminUrl: string;
      } | null;
    };
    payments: {
      ready: boolean;
      items: Array<{ type: string; label: string; paid: boolean; confirmedAt: string | null }>;
    };
    ready: boolean;
    missing: string[];
  };
};

export async function getMyExamApp() {
  const res = await api.get('/exam-applications/me');
  return res.data as ExamApp;
}

export async function getExamAppDetails(userId: string) {
  const res = await api.get(`/exam-applications/${userId}/details`);
  return res.data as ExamReadinessDetails;
}
