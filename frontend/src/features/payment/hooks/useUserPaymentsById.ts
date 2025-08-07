// src/features/payment/hooks/useUserPaymentsById.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPaymentsById } from '../api/getUserPaymentsById';

export function useUserPaymentsById(userId: string | undefined) {
  return useQuery({
    queryKey: ['payments', userId],
    queryFn: () => getUserPaymentsById(userId!),
    enabled: !!userId,
  });
}
