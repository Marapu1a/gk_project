import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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

export function useUpdateExternalSupervisorClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'APPROVED' | 'REJECTED' }) =>
      updateExternalSupervisorClaim(userId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'external-supervisor-claims'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', variables.userId] });
    },
  });
}
