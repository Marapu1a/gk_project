import { useQuery } from '@tanstack/react-query';
import { getExamAppDetails } from '../api/getMyExamApp';

export function useExamAppDetails(userId?: string | null, applicationId?: string | null) {
  return useQuery({
    queryKey: ['exam', 'details', userId, applicationId ?? null],
    queryFn: () => getExamAppDetails(userId as string, applicationId),
    enabled: Boolean(userId),
  });
}
