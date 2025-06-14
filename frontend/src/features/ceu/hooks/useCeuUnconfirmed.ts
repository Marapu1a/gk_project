// src/features/ceu/hooks/useCeuUnconfirmed.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuList } from '../api/getCeuList';

export interface CeuCategorySum {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
}

export function useCeuUnconfirmed() {
  return useQuery({
    queryKey: ['ceu', 'unconfirmed'],
    queryFn: async () => {
      const { records } = await getCeuList();

      const sum: CeuCategorySum = {
        ethics: 0,
        cultDiver: 0,
        supervision: 0,
        general: 0,
      };

      for (const record of records) {

        for (const entry of record.entries) {

          if (entry.status === 'UNCONFIRMED') {
            switch (entry.category) {
              case 'ETHICS':
                sum.ethics += entry.value;
                break;
              case 'CULTURAL_DIVERSITY':
                sum.cultDiver += entry.value;
                break;
              case 'SUPERVISION':
                sum.supervision += entry.value;
                break;
              case 'GENERAL':
                sum.general += entry.value;
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
