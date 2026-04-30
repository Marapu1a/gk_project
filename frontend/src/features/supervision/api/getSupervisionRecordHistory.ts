import { api } from '@/lib/axios';

export type SupervisionRecordHistoryStatus =
  | 'UNCONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'SPENT'
  | 'MIXED';

export type SupervisionRecordHistoryItem = {
  id: string;
  fileId: string | null;
  createdAt: string;
  periodStartedAt: string | null;
  periodEndedAt: string | null;
  treatmentSetting: string | null;
  description: string | null;
  ethicsAcceptedAt: string | null;
  hours: {
    implementing: number;
    programming: number;
    mentor: number;
  };
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
    direct: number;
    nonObserving: number;
  };
  status: SupervisionRecordHistoryStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string;
  };
  supervisor: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
};

export type GetSupervisionRecordHistoryResponse = {
  records: SupervisionRecordHistoryItem[];
  nextCursor: string | null;
};

export async function getSupervisionRecordHistory(params: {
  take?: number;
  cursor?: string | null;
} = {}): Promise<GetSupervisionRecordHistoryResponse> {
  const { data } = await api.get<GetSupervisionRecordHistoryResponse>(
    '/supervision/history/records',
    { params },
  );
  return data;
}
