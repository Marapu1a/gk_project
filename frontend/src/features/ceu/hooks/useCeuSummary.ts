// src/features/ceu/hooks/useCeuSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuSummary, type CeuSummaryResponse, type Level } from '../api/getCeuSummary';

/**
 * Хук CEU-сводки.
 * Если передан level — считаем требования по выбранной цели.
 * Если нет — поведение по умолчанию (лесенка/активная группа).
 */
export function useCeuSummary(level?: Level | null) {
  const lvl = level ?? undefined;

  return useQuery<CeuSummaryResponse>({
    queryKey: ['ceu', 'summary', lvl ?? 'default'],
    queryFn: () => getCeuSummary(lvl),
    staleTime: 5 * 60 * 1000,
  });
}
