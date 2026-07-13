import type { QueryClient } from '@tanstack/react-query';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';

export const userPaymentsQueryKey = ['payments', 'me'] as const;

export const userPaymentsByIdQueryKey = (userId: string) =>
  ['payments', 'user', userId] as const;

export async function invalidatePaymentQueries(queryClient: QueryClient, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: userPaymentsQueryKey }),
    queryClient.invalidateQueries({ queryKey: userPaymentsByIdQueryKey(userId) }),
    queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
    queryClient.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) }),
  ]);
}
