// src/features/registry/api/getRegistryProfile.ts
import { api } from '@/lib/axios';

export type RegistryCertificate = {
  id: string;
  title: string;
  number: string;
  issuedAt: string;   // ISO
  expiresAt: string;  // ISO
  fileId: string;
};

export type RegistryProfile = {
  id: string;
  fullName: string;
  country?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  createdAt: string;    // ISO
  bio?: string | null;
  certificate?: RegistryCertificate | null;
};

export async function getRegistryProfile(userId: string) {
  const res = await api.get(`/registry/${userId}`);
  return res.data as RegistryProfile;
}
