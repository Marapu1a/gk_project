// src/features/registry/hooks/useRegistry.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getRegistry, type RegistryListResponse } from '../api/getRegistry';

type Filters = { country?: string; city?: string; page?: number; limit?: number };

export function useRegistry(filters: Filters = {}) {
  const { country, city, page = 1, limit = 20 } = filters;

  return useQuery<RegistryListResponse>({
    queryKey: ['registry', country || '', city || '', page, limit],
    queryFn: () => getRegistry({ country, city, page, limit }),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
