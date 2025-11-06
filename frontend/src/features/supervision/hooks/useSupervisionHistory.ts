// src/features/supervision/hooks/useSupervisionHistory.ts
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getSupervisionHistory,
  type GetSupervisionHistoryParams,
  type GetSupervisionHistoryResponse,
} from '../api/getSupervisionHistory';

type HistoryOpts = Partial<Omit<GetSupervisionHistoryParams, 'cursor'>>;

export function useSupervisionHistory(params: HistoryOpts = {}) {
  const stableParams = useMemo(
    () => ({ status: params.status, take: params.take ?? 25 }),
    [params.status, params.take]
  );

  return useInfiniteQuery<GetSupervisionHistoryResponse, Error>({
    queryKey: ['supervision', 'history', stableParams],
    queryFn: ({ pageParam }) =>
      getSupervisionHistory({ ...stableParams, cursor: (pageParam ?? null) as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
