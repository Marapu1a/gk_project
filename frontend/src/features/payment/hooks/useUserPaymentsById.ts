// src/features/payment/hooks/useUserPaymentsById.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPaymentsById } from '../api/getUserPaymentsById';
import { userPaymentsByIdQueryKey } from '../model/paymentQueryInvalidation';

export { userPaymentsByIdQueryKey };

export function useUserPaymentsById(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? userPaymentsByIdQueryKey(userId) : ['payments', 'user', 'unknown'],
    queryFn: () => getUserPaymentsById(userId!),
    enabled: !!userId,
  });
}
