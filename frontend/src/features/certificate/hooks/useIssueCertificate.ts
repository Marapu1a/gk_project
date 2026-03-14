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
      await qc.invalidateQueries({ queryKey: ['certificates'] });
      await qc.invalidateQueries({ queryKey: ['me'] });

      await qc.invalidateQueries({ queryKey: ['ceuSummary'] });
      await qc.invalidateQueries({ queryKey: ['supervisionSummary'] });

      // оплаты встречаются под разными ключами
      await qc.invalidateQueries({ queryKey: ['payments'] });
      await qc.invalidateQueries({ queryKey: ['userPayments'] });

      // админская карточка юзера
      await qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}
