import { api } from '@/lib/axios';

export type CeuCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
export type CeuActivityType =
  | 'TRAINING_ATTENDANCE'
  | 'PRESENTATION'
  | 'PUBLICATION'
  | 'TEACHING';
export type CeuRecordStatus =
  | 'UNCONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'SPENT';

export interface CeuHistoryEntry {
  id: string;
  category: CeuCategory;
  activityType: CeuActivityType | null;
  value: number;
  status: CeuRecordStatus;
  rejectedReason: string | null;
  isAdminCorrection: boolean;
  previousValue: number | null;
}

export interface CeuHistoryItem {
  id: string;
  totalValue: number;
  status: CeuRecordStatus;
  rejectedReason: string | null;
  eventDate: string;
  eventName: string;
  isAdminCorrection: boolean;
  entries: CeuHistoryEntry[];
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
  } | null;
  user: {
    fullName: string | null;
    email: string;
  };
}

export async function getCeuHistory(): Promise<CeuHistoryItem[]> {
  const res = await api.get<CeuHistoryItem[]>('/ceu/history');
  return res.data;
}
