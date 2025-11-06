// src/features/supervision/hooks/useSubmitSupervisionRequest.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitSupervisionRequest,
  type SubmitSupervisionRequestResponse,
} from '../api/submitSupervisionRequest';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

export function useSubmitSupervisionRequest() {
  const qc = useQueryClient();

  return useMutation<SubmitSupervisionRequestResponse, Error, SupervisionRequestFormData>({
    mutationFn: submitSupervisionRequest,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supervision', 'history'] });
      await qc.invalidateQueries({ queryKey: ['supervision', 'summary'] });
    },
  });
}
