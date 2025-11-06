// src/features/supervision/hooks/useAssignedHours.ts
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getAssignedHours,
  type GetAssignedHoursResponse,
  type GetAssignedHoursParams,
} from '../api/getAssignedHours';

type AssignedHoursOpts = Partial<Omit<GetAssignedHoursParams, 'cursor'>>;

export function useAssignedHours(params: AssignedHoursOpts = {}) {
  const keyParams = useMemo(
    () => ({ status: params.status ?? 'UNCONFIRMED', take: params.take ?? 25 }),
    [params.status, params.take]
  );

  return useInfiniteQuery<GetAssignedHoursResponse, Error>({
    queryKey: ['review', 'supervision', keyParams],
    queryFn: ({ pageParam }) =>
      getAssignedHours({ ...keyParams, cursor: (pageParam ?? null) as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
