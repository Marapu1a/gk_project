import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import {
  invalidatePaymentQueries,
  userPaymentsByIdQueryKey,
  userPaymentsQueryKey,
} from './paymentQueryInvalidation';

describe('invalidatePaymentQueries', () => {
  it('invalidates every payment consumer for the affected user only', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const userId = 'user-1';
    const affectedKeys = [
      userPaymentsQueryKey,
      userPaymentsByIdQueryKey(userId),
      currentUserQueryKey,
      adminUserDetailsQueryKey(userId),
    ] as const;
    const unrelatedKeys = [
      userPaymentsByIdQueryKey('user-2'),
      adminUserDetailsQueryKey('user-2'),
      ['registry'] as const,
    ] as const;

    [...affectedKeys, ...unrelatedKeys].forEach((queryKey) => {
      queryClient.setQueryData(queryKey, { loaded: true });
    });

    await invalidatePaymentQueries(queryClient, userId);

    affectedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    });
    unrelatedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
    });
  });
});
