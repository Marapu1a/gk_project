// src/features/supervision/hooks/useSupervisionHistory.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getSupervisionHistory,
  type GetSupervisionHistoryParams,
  type GetSupervisionHistoryResponse,
} from '../api/getSupervisionHistory';

type HistoryOpts = Partial<Omit<GetSupervisionHistoryParams, 'cursor'>>;

export function useSupervisionHistory(params: HistoryOpts = {}) {
  return useInfiniteQuery<GetSupervisionHistoryResponse, Error>({
    queryKey: ['supervision', 'history', params],
    queryFn: ({ pageParam }) =>
      getSupervisionHistory({ ...params, cursor: (pageParam ?? null) as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
