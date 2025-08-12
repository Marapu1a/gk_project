import { useQuery } from '@tanstack/react-query';
import { getUserCertificates } from '../api/getUserCertificates';

export function useUserCertificates(userId?: string, enabled = !!userId) {
  return useQuery({
    queryKey: ['certificates', 'user', userId],
    queryFn: () => getUserCertificates(userId!),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
