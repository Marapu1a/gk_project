import { useQuery } from '@tanstack/react-query';
import { getExamApps } from '../api/getExamApps';

export function useExamApps() {
  return useQuery({
    queryKey: ['exam', 'all'],
    queryFn: getExamApps,
    staleTime: 60 * 1000,
  });
}
