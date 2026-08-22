import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removePendingReviewerHours } from '../../api/supervision/removePendingReviewerHours';
import { adminUserDetailsQueryKeyPrefix } from '../useUserDetails';

export function useRemovePendingReviewerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      relationId,
      notifyUser,
      recordId,
    }: {
      relationId: string;
      notifyUser: boolean;
      recordId: string;
    }) => removePendingReviewerHours(relationId, notifyUser, recordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'supervision', 'reviewerCandidates'] });
      void queryClient.invalidateQueries({ queryKey: adminUserDetailsQueryKeyPrefix });
    },
  });
}
