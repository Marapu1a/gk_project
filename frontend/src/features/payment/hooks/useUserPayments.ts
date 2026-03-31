// src/features/payment/hooks/useUserPayments.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPayments } from '../api/getUserPayments';

export const userPaymentsQueryKey = ['payments', 'me'] as const;

export function useUserPayments() {
  return useQuery({
    queryKey: userPaymentsQueryKey,
    queryFn: getUserPayments,
    staleTime: 60 * 1000,
  });
}
