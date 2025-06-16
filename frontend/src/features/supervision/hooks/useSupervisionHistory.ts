// src/features/supervision/hooks/useSupervisionHistory.ts
import { useQuery } from '@tanstack/react-query';
import { getSupervisionHistory } from '../api/getSupervisionHistory';

export function useSupervisionHistory() {
  return useQuery({
    queryKey: ['supervision', 'history'],
    queryFn: getSupervisionHistory,
  });
}
