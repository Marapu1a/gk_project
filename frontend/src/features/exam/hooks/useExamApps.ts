import { useQuery } from '@tanstack/react-query';
import { getExamApps } from '../api/getExamApps';

export function useExamApps(search = '') {
  return useQuery({
    queryKey: ['exam', 'all', search],
    queryFn: () => getExamApps(search),
    staleTime: 60 * 1000,
  });
}
