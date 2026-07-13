import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignExternalSupervisorClaim,
  getExternalSupervisorClaims,
  updateExternalSupervisorClaim,
} from '../api/externalSupervisorClaims';
import { adminUserDetailsQueryKey } from './useUserDetails';

export function useExternalSupervisorClaims(
  mode: 'active' | 'history',
  page = 1,
  perPage = 20,
  nameSort?: 'asc' | 'desc',
  refetchInterval?: number,
) {
  return useQuery({
    queryKey: ['admin', 'external-supervisor-claims', mode, page, perPage, nameSort ?? ''],
    queryFn: () => getExternalSupervisorClaims(mode, page, perPage, nameSort),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

function invalidateClaims(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'external-supervisor-claims'] });
  queryClient.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
}

export function useAssignExternalSupervisorClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'assign' | 'unassign' }) =>
      assignExternalSupervisorClaim(userId, action),
    onSuccess: (_, variables) => invalidateClaims(queryClient, variables.userId),
  });
}

export function useUpdateExternalSupervisorClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: 'APPROVED' | 'REJECTED' | 'SETUP_COMPLETE';
    }) => updateExternalSupervisorClaim(userId, status),
    onSuccess: (_, variables) => invalidateClaims(queryClient, variables.userId),
  });
}
