import { useQuery } from '@tanstack/react-query';
import { getMyCertificates } from '../api/getMyCertificates';

export function useMyCertificates(enabled = true) {
  return useQuery({
    queryKey: ['certificates', 'me'],
    queryFn: getMyCertificates,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
