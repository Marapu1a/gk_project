import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestDocumentDeletion } from '../api/requestDocumentDeletion';

export function useRequestDocumentDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileReviewId, comment }: { fileReviewId: string; comment: string }) =>
      requestDocumentDeletion(fileReviewId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docReviewReq'] });
    },
  });
}
