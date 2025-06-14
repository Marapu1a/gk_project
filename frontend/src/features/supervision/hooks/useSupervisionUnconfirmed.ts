// src/features/supervision/hooks/useSupervisionUnconfirmed.ts
import { useQuery } from '@tanstack/react-query';
import { getSupervisionList } from '../api/getSupervisionList';

export interface SupervisionCategorySum {
  instructor: number;
  curator: number;
  supervisor: number;
}

export function useSupervisionUnconfirmed() {
  return useQuery({
    queryKey: ['supervision', 'unconfirmed'],
    queryFn: async () => {
      const { records } = await getSupervisionList();

      const sum: SupervisionCategorySum = {
        instructor: 0,
        curator: 0,
        supervisor: 0,
      };

      for (const record of records) {
        for (const hour of record.hours) {
          if (hour.status === 'UNCONFIRMED') {
            switch (hour.type) {
              case 'INSTRUCTOR':
                sum.instructor += hour.value;
                break;
              case 'CURATOR':
                sum.curator += hour.value;
                break;
              case 'SUPERVISOR':
                sum.supervisor += hour.value;
                break;
            }
          }
        }
      }

      return sum;
    },
    staleTime: 5 * 60 * 1000,
  });
}
