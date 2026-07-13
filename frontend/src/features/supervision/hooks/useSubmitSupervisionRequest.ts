// src/features/supervision/hooks/useSubmitSupervisionRequest.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitSupervisionRequest,
  type SubmitSupervisionRequestResponse,
} from '../api/submitSupervisionRequest';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';
import { invalidateSupervisionSubmissionQueries } from '../model/supervisionSubmission';

export function useSubmitSupervisionRequest() {
  const qc = useQueryClient();

  return useMutation<SubmitSupervisionRequestResponse, Error, SupervisionRequestFormData>({
    mutationFn: submitSupervisionRequest,
    onSuccess: () => invalidateSupervisionSubmissionQueries(qc),
  });
}
