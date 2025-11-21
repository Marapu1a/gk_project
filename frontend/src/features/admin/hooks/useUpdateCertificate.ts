// src/features/admin/hooks/useUpdateCertificate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateCertificate,
  type UpdateCertificatePayload,
  type AdminCertificate,
} from '@/features/admin/api/updateCertificate';

type UpdateCertificateArgs = {
  certificateId: string;
  payload: UpdateCertificatePayload;
};

/**
 * Обновление сертификата админом.
 * userId нужен только для инвалидации списка сертификатов конкретного пользователя.
 */
export function useUpdateCertificate(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<AdminCertificate, unknown, UpdateCertificateArgs>({
    mutationFn: ({ certificateId, payload }) =>
      updateCertificate(certificateId, payload),
    onSuccess: () => {
      // подстрой под свой ключ, если он у тебя другой
      queryClient.invalidateQueries({
        queryKey: ['admin', 'user-certificates', userId],
      });
    },
  });
}
