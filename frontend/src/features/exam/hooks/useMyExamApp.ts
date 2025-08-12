import { useQuery } from '@tanstack/react-query';
import { getMyExamApp } from '../api/getMyExamApp';

export function useMyExamApp() {
  return useQuery({
    queryKey: ['exam', 'me'],
    queryFn: getMyExamApp,
    staleTime: 5 * 60 * 1000,
  });
}
