// src/features/registry/hooks/useRegistryProfile.ts
import { useQuery } from '@tanstack/react-query';
import { getRegistryProfile, type RegistryProfile } from '../api/getRegistryProfile';

export function useRegistryProfile(userId?: string) {
  return useQuery<RegistryProfile>({
    queryKey: ['registry-profile', userId ?? ''],
    queryFn: () => getRegistryProfile(userId as string),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
