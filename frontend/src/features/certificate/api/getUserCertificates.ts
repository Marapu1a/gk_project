import { api } from '@/lib/axios';
import type { CertificateDTO } from './issueCertificate';

export async function getUserCertificates(userId: string): Promise<CertificateDTO[]> {
  const res = await api.get(`/admin/users/${userId}/certificates`);
  return res.data;
}
