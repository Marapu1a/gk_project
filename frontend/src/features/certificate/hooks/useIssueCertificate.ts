import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issueCertificate, type IssueCertificatePayload, type CertificateDTO } from '../api/issueCertificate';

export function useIssueCertificate() {
  const qc = useQueryClient();

  return useMutation<CertificateDTO, unknown, IssueCertificatePayload>({
    mutationFn: issueCertificate,
    onSuccess() {
      // Простая стратегия: инвалидация всех кэшев по сертификатам.
      qc.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}
