import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteDocumentReviewFile,
  transferDocumentReviewFileToActiveCycle,
  updateDocumentReviewFile,
  type UpdateDocumentReviewFilePayload,
} from '../api/updateDocumentReviewFile';
import { adminUserDetailsQueryKeyPrefix } from '@/features/admin/hooks/useUserDetails';

function invalidateDocumentReviewQueries(queryClient: ReturnType<typeof useQueryClient>, requestId?: string) {
  if (requestId) {
    queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequest', requestId] });
  }
  queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequests'] });
  queryClient.invalidateQueries({ queryKey: adminUserDetailsQueryKeyPrefix });
  queryClient.invalidateQueries({ queryKey: ['docReviewReq'] });
  queryClient.invalidateQueries({ queryKey: ['exam'] });
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

export function useTransferDocumentReviewFileToActiveCycle(requestId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileReviewId: string) => {
      if (!requestId) throw new Error('requestId is required');
      return transferDocumentReviewFileToActiveCycle(requestId, fileReviewId);
    },
    onSuccess: (data: any) => {
      invalidateDocumentReviewQueries(queryClient, requestId);
      if (data?.targetRequestId) {
        queryClient.invalidateQueries({
          queryKey: ['admin', 'docReviewRequest', data.targetRequestId],
        });
      }
    },
  });
}
