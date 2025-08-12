import { api } from '@/lib/axios';
import type { CertificateDTO } from './issueCertificate';

export async function getMyCertificates(): Promise<CertificateDTO[]> {
  const res = await api.get('/me/certificates');
  return res.data;
}
