import { api } from '@/lib/axios';

export type AdminCeuCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
export type AdminCeuStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type AdminCeuActivityType =
  | 'TRAINING_ATTENDANCE'
  | 'PRESENTATION'
  | 'PUBLICATION'
  | 'TEACHING'
  | null;
export type AdminCeuSortBy =
  | 'createdAt'
  | 'eventDate'
  | 'email'
  | 'group'
  | 'category'
  | 'status'
  | 'points';
export type AdminCeuSortDir = 'asc' | 'desc';

export type AdminCeuHistoryParams = {
  createdFrom?: string;
  createdTo?: string;
  search?: string;
  group?: string;
  category?: AdminCeuCategory | 'ALL';
  status?: AdminCeuStatus | 'ALL';
  sortBy?: AdminCeuSortBy;
  sortDir?: AdminCeuSortDir;
  page?: number;
  perPage?: number;
};

export type AdminCeuHistoryRow = {
  entryId: string;
  recordId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  currentGroup: { id: string; name: string; rank: number } | null;
  groups: { id: string; name: string; rank: number }[];
  recordCreatedAt: string;
  eventDate: string;
  eventName: string;
  activityType: AdminCeuActivityType;
  category: AdminCeuCategory;
  points: number;
  status: AdminCeuStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
  reviewer: { id: string; email: string; fullName: string | null } | null;
  cycle: {
    id: string;
    type: 'CERTIFICATION' | 'RENEWAL';
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
    startedAt: string;
  } | null;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
    createdAt: string;
  } | null;
};

export type AdminCeuHistoryResponse = {
  total: number;
  page: number;
  perPage: number;
  rows: AdminCeuHistoryRow[];
};

export async function getAdminCeuHistory(
  params: AdminCeuHistoryParams
): Promise<AdminCeuHistoryResponse> {
  const res = await api.get<AdminCeuHistoryResponse>('/admin/ceu/history', { params });
  return res.data;
}
