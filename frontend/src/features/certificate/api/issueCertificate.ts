// src/features/certificate/api/issueCertificate.ts
import { api } from '@/lib/axios';

export type CertificateDTO = {
  id: string;
  title: string;
  number: string;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
  isRenewal: boolean;
  previousId: string | null;
  cycleId: string | null;

  group: { id: string; name: string; rank: number };
  file: { id: string; name: string; fileId: string };
  confirmedBy: { id: string; email: string; fullName: string } | null;

  isActiveNow: boolean;
  isExpired: boolean;

  // from handler response (handy for UI/toasts/debug)
  closedCycleId?: string;
  spentCeuCount?: number;
  paymentsResetCount?: number;
};

export type IssueCertificatePayload = {
  email: string;
  title: string;
  number: string;
  issuedAt: string;
  expiresAt: string; // ISO
  uploadedFileId: string; // UploadedFile.id
};

export async function issueCertificate(payload: IssueCertificatePayload): Promise<CertificateDTO> {
  const { data } = await api.post<CertificateDTO>('/admin/certificates/issue', payload);
  return data;
}
