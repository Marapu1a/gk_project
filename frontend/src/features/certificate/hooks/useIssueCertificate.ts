// src/features/certificate/hooks/useIssueCertificate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  issueCertificate,
  type IssueCertificatePayload,
  type CertificateDTO,
} from '../api/issueCertificate';

export function useIssueCertificate() {
  const qc = useQueryClient();

  return useMutation<CertificateDTO, unknown, IssueCertificatePayload>({
    mutationFn: issueCertificate,

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['certificates'] }),
        qc.invalidateQueries({ queryKey: ['me'] }),

        qc.invalidateQueries({ queryKey: ['ceuSummary'] }),
        qc.invalidateQueries({ queryKey: ['supervisionSummary'] }),

        qc.invalidateQueries({ queryKey: ['payments'] }),
        qc.invalidateQueries({ queryKey: ['payments', 'me'] }),

        qc.invalidateQueries({ queryKey: ['admin', 'user'] }),
      ]);
    },
  });
}
