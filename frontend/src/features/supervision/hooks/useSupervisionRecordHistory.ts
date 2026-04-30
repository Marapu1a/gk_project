import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getSupervisionRecordHistory,
  type GetSupervisionRecordHistoryResponse,
} from '../api/getSupervisionRecordHistory';

export function useSupervisionRecordHistory(params: { take?: number } = {}) {
  const take = params.take ?? 25;

  return useInfiniteQuery<GetSupervisionRecordHistoryResponse, Error>({
    queryKey: ['supervision', 'history', 'records', { take }],
    queryFn: ({ pageParam }) =>
      getSupervisionRecordHistory({ take, cursor: (pageParam ?? null) as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

