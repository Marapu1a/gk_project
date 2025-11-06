// src/features/supervision/hooks/useSupervisionUnconfirmed.ts
import { useQuery } from '@tanstack/react-query';
import { getSupervisionList } from '../api/getSupervisionList';

// новые ключи
export interface SupervisionCategorySum {
  practice: number;
  supervision: number;
  supervisor: number;
}

function normalizeType(t: string): 'practice' | 'supervision' | 'supervisor' | null {
  if (t === 'INSTRUCTOR' || t === 'PRACTICE') return 'practice';
  if (t === 'CURATOR' || t === 'SUPERVISION') return 'supervision';
  if (t === 'SUPERVISOR') return 'supervisor';
  return null;
}

export function useSupervisionUnconfirmed() {
  return useQuery({
    queryKey: ['supervision', 'unconfirmed'],
    queryFn: async () => {
      const { records } = await getSupervisionList({ status: 'UNCONFIRMED' });

      const sum: SupervisionCategorySum = { practice: 0, supervision: 0, supervisor: 0 };

      for (const record of records) {
        for (const hour of record.hours) {
          const norm = normalizeType(hour.type);
          if (!norm) continue;
          sum[norm] += hour.value;
        }
      }

      return sum;
    },
    staleTime: 5 * 60 * 1000,
  });
}
