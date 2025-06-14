// src/features/supervision/hooks/useSubmitSupervisionRequest.ts
import { useMutation } from '@tanstack/react-query';
import { submitSupervisionRequest } from '../api/submitSupervisionRequest';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

export function useSubmitSupervisionRequest() {
  return useMutation({
    mutationFn: (data: SupervisionRequestFormData) => submitSupervisionRequest(data),
  });
}
