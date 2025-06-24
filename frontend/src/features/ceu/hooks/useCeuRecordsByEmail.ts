import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

type CEUEntryStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';

type CEUEntry = {
  id: string;
  category: 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
  value: number;
  status: CEUEntryStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
  reviewer: {
    email: string;
    fullName: string;
  } | null;
};

type CEURecord = {
  id: string;
  eventName: string;
  eventDate: string;
  fileId: string;
  entries: CEUEntry[];
};


export type CEUReviewResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  records: CEURecord[];
};

export function useCEURecordsByEmail(email: string, enabled: boolean) {
  return useQuery<CEUReviewResponse>({
    queryKey: ['ceu', 'review', email],
    queryFn: async () => {
      const res = await api.get('/ceu/by-email', {
        params: { email },
      });
      return res.data;
    },
    enabled,
  });
}
