// src/features/payment/hooks/useUserPayments.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPayments } from '../api/getUserPayments';
import { userPaymentsQueryKey } from '../model/paymentQueryInvalidation';

export { userPaymentsQueryKey };

export function useUserPayments() {
  return useQuery({
    queryKey: userPaymentsQueryKey,
    queryFn: getUserPayments,
    staleTime: 60 * 1000,
  });
}
