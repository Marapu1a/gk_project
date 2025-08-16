// src/features/supervision/hooks/useAssignedHours.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getAssignedHours,
  type GetAssignedHoursResponse,
  type GetAssignedHoursParams,
} from '../api/getAssignedHours';

type AssignedHoursOpts = Partial<Omit<GetAssignedHoursParams, 'cursor'>>;

export function useAssignedHours(params: AssignedHoursOpts = {}) {
  // ВАЖНО: НЕ указываем 3-й дженерик (TData), иначе data теряет .pages
  return useInfiniteQuery<GetAssignedHoursResponse, Error>({
    queryKey: ['review', 'supervision', params],
    queryFn: ({ pageParam }) =>
      getAssignedHours({ ...params, cursor: (pageParam ?? null) as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
