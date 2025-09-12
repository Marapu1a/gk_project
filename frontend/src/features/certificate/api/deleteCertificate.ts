// src/features/certificates/api/deleteCertificate.ts
import { api } from '@/lib/axios';

export async function deleteCertificate(certId: string): Promise<void> {
  await api.delete(`/admin/certificates/${certId}`);
}
