// src/features/registry/api/getRegistry.ts
import { api } from '@/lib/axios';

export type RegistryCard = {
  id: string;
  fullName: string;
  fullNameLatin: string;
  country?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

export type RegistryListResponse = {
  items: RegistryCard[];
  total: number;
  page: number;
  limit: number;
};

export async function getRegistry(params?: {
  country?: string;
  city?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get('/registry', { params });
  return res.data as RegistryListResponse;
}
