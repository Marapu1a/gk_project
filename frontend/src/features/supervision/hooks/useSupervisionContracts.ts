import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupervisionContract,
  deleteSupervisionContract,
  getSupervisionContracts,
  type SupervisionContract,
} from '../api/supervisionContracts';

export function useSupervisionContracts() {
  return useQuery<SupervisionContract[]>({
    queryKey: ['supervision', 'contracts'],
    queryFn: getSupervisionContracts,
  });
}

export function useCreateSupervisionContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupervisionContract,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['supervision', 'contracts'] });
    },
  });
}

export function useDeleteSupervisionContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSupervisionContract,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['supervision', 'contracts'] });
    },
  });
}
