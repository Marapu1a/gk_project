import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateReviewerCandidateRelation,
  type UpdateReviewerCandidateRelationInput,
} from '../api/updateReviewerCandidateRelation';

export function useUpdateReviewerCandidateRelation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateReviewerCandidateRelationInput) =>
      updateReviewerCandidateRelation(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['supervision', 'reviewerCandidates'] });
      await qc.invalidateQueries({ queryKey: ['supervision', 'reviewerRequests'] });
      await qc.invalidateQueries({ queryKey: ['supervision', 'reviewerCandidateDetails'] });
    },
  });
}
