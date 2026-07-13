// src/features/certificates/hooks/useDeleteCertificate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCertificate } from '../api/deleteCertificate';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';

export function useDeleteCertificate(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => deleteCertificate(certId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificates', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['certificates', 'me'] }); // на всякий
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
      qc.invalidateQueries({ queryKey: ['admin', 'user-certificates', userId] });
    },
  });
}
