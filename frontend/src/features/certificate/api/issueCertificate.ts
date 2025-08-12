import { api } from '@/lib/axios';

export type CertificateDTO = {
  id: string;
  title: string;
  number: string;
  issuedAt: string;   // ISO
  expiresAt: string;  // ISO
  isRenewal: boolean;
  previousId: string | null;
  group: { id: string; name: string; rank: number };
  file: { id: string; name: string; fileId: string };
  confirmedBy: { id: string; email: string; fullName: string } | null;
  isActiveNow: boolean;
  isExpired: boolean;
};

export type IssueCertificatePayload = {
  email: string;
  title: string;
  number: string;
  expiresAt: string;      // ISO (будущее)
  uploadedFileId: string; // UploadedFile.id
};

export async function issueCertificate(
  payload: IssueCertificatePayload
): Promise<CertificateDTO> {
  const res = await api.post('/admin/certificates/issue', payload);
  return res.data;
}
