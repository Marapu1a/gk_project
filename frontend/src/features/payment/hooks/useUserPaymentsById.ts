// src/features/payment/hooks/useUserPaymentsById.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPaymentsById } from '../api/getUserPaymentsById';

export const userPaymentsByIdQueryKey = (userId: string) =>
  ['payments', 'user', userId] as const;

export function useUserPaymentsById(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? userPaymentsByIdQueryKey(userId) : ['payments', 'user', 'unknown'],
    queryFn: () => getUserPaymentsById(userId!),
    enabled: !!userId,
  });
}
