import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getExamApps } from '../api/getExamApps';

export function useExamApps(search = '', refetchInterval?: number) {
  return useQuery({
    queryKey: ['exam', 'all', search],
    queryFn: () => getExamApps(search),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}
