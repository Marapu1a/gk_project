import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActiveUserBanner,
  getAdminUserBanner,
  updateAdminUserBanner,
  type UpdateUserBannerPayload,
} from '../api/userBanner';

export function useActiveUserBanner() {
  return useQuery({
    queryKey: ['user-banner', 'active'],
    queryFn: getActiveUserBanner,
    staleTime: 60_000,
  });
}

export function useAdminUserBanner() {
  return useQuery({
    queryKey: ['admin', 'user-banner'],
    queryFn: getAdminUserBanner,
  });
}

export function useUpdateAdminUserBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserBannerPayload) => updateAdminUserBanner(payload),
    onSuccess: (banner) => {
      queryClient.setQueryData(['admin', 'user-banner'], banner);
      queryClient.invalidateQueries({ queryKey: ['user-banner', 'active'] });
    },
  });
}
