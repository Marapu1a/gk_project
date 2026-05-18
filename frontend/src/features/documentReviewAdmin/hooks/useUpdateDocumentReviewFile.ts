import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteDocumentReviewFile,
  updateDocumentReviewFile,
  type UpdateDocumentReviewFilePayload,
} from '../api/updateDocumentReviewFile';

function invalidateDocumentReviewQueries(queryClient: ReturnType<typeof useQueryClient>, requestId?: string) {
  if (requestId) {
    queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequest', requestId] });
  }
  queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequests'] });
  queryClient.invalidateQueries({ queryKey: ['docReviewReq'] });
}

export function useUpdateDocumentReviewFile(requestId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileReviewId,
      payload,
    }: {
      fileReviewId: string;
      payload: UpdateDocumentReviewFilePayload;
    }) => {
      if (!requestId) throw new Error('requestId is required');
      return updateDocumentReviewFile(requestId, fileReviewId, payload);
    },
    onSuccess: () => invalidateDocumentReviewQueries(queryClient, requestId),
  });
}

export function useDeleteDocumentReviewFile(requestId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileReviewId: string) => {
      if (!requestId) throw new Error('requestId is required');
      return deleteDocumentReviewFile(requestId, fileReviewId);
    },
    onSuccess: () => invalidateDocumentReviewQueries(queryClient, requestId),
  });
}
