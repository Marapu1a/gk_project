import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignExternalSupervisorClaim,
  getExternalSupervisorClaims,
  updateExternalSupervisorClaim,
} from '../api/externalSupervisorClaims';

export function useExternalSupervisorClaims(
  mode: 'active' | 'history',
  page = 1,
  perPage = 20,
) {
  return useQuery({
    queryKey: ['admin', 'external-supervisor-claims', mode, page, perPage],
    queryFn: () => getExternalSupervisorClaims(mode, page, perPage),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

function invalidateClaims(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'external-supervisor-claims'] });
  queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
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
