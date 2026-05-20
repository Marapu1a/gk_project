import { useQuery } from '@tanstack/react-query';
import { getExamAppDetails } from '../api/getMyExamApp';

export function useExamAppDetails(userId?: string | null) {
  return useQuery({
    queryKey: ['exam', 'details', userId],
    queryFn: () => getExamAppDetails(userId as string),
    enabled: Boolean(userId),
  });
}
