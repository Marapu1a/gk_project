// src/features/certificate/hooks/useIssueCertificate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  issueCertificate,
  type IssueCertificatePayload,
  type CertificateDTO,
} from '../api/issueCertificate';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { ceuSummaryQueryKey } from '@/features/ceu/hooks/useCeuSummary';
import { supervisionSummaryQueryKey } from '@/features/supervision/hooks/useSupervisionSummary';

export function useIssueCertificate() {
  const qc = useQueryClient();

  return useMutation<CertificateDTO, unknown, IssueCertificatePayload>({
    mutationFn: issueCertificate,

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['certificates'] }),
        qc.invalidateQueries({ queryKey: currentUserQueryKey }),

        qc.invalidateQueries({ queryKey: ceuSummaryQueryKey }),
        qc.invalidateQueries({ queryKey: supervisionSummaryQueryKey }),

        qc.invalidateQueries({ queryKey: ['payments'] }),
        qc.invalidateQueries({ queryKey: ['payments', 'me'] }),

        qc.invalidateQueries({ queryKey: ['admin', 'user'] }),
      ]);
    },
  });
}
