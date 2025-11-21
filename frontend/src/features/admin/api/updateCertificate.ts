// src/features/admin/api/updateCertificate.ts
import { api } from '@/lib/axios';

export type UpdateCertificatePayload = {
  title?: string;
  number?: string;
  issuedAt?: string;       // ISO
  expiresAt?: string;      // ISO
  uploadedFileId?: string; // UploadedFile.id
};

export type AdminCertificateGroup = {
  id: string;
  name: string;
  rank: number;
};

export type AdminCertificateFile = {
  id: string;
  name: string;
  fileId: string; // относительный путь внутри /uploads
};

export type AdminCertificateConfirmedBy = {
  id: string;
  email: string;
  fullName: string | null;
};

export type AdminCertificate = {
  id: string;
  title: string;
  number: string;
  issuedAt: string;
  expiresAt: string;
  isRenewal: boolean;
  previousId: string | null;
  group: AdminCertificateGroup;
  file: AdminCertificateFile;
  confirmedBy: AdminCertificateConfirmedBy | null;
  isActiveNow: boolean;
  isExpired: boolean;
};

/**
 * PATCH /admin/certificates/:id
 * Обновление выданного сертификата (только для админа).
 * Можно передавать любое подмножество полей payload.
 */
export async function updateCertificate(
  id: string,
  payload: UpdateCertificatePayload
): Promise<AdminCertificate> {
  if (!id) {
    throw new Error('certificate id is required');
  }

  const { data } = await api.patch<AdminCertificate>(
    `/admin/certificates/${id}`,
    payload
  );

  return data;
}
