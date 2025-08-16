// src/features/supervision/hooks/useSubmitSupervisionRequest.ts
import { useMutation } from '@tanstack/react-query';
import { submitSupervisionRequest, type SubmitSupervisionRequestResponse } from '../api/submitSupervisionRequest';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';

export function useSubmitSupervisionRequest() {
  return useMutation<SubmitSupervisionRequestResponse, Error, SupervisionRequestFormData>({
    mutationFn: submitSupervisionRequest,
  });
}
