import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAdminCeuHistory,
  type AdminCeuHistoryParams,
  type AdminCeuHistoryResponse,
} from '../../api/ceu/getAdminCeuHistory';

export function useAdminCeuHistory(params: AdminCeuHistoryParams) {
  return useQuery<AdminCeuHistoryResponse>({
    queryKey: ['admin', 'ceu-history', params],
    queryFn: () => getAdminCeuHistory(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
