import { api } from '@/lib/axios';

export type UserBannerTone = 'DANGER' | 'DARK' | 'SOFT';

export type UserBanner = {
  id: string;
  enabled: boolean;
  tone: UserBannerTone;
  message: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  dismissible: boolean;
  updatedAt: string;
};

export type UpdateUserBannerPayload = {
  enabled: boolean;
  tone: UserBannerTone;
  message: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  dismissible: boolean;
};

export async function getActiveUserBanner(): Promise<UserBanner | null> {
  const { data } = await api.get<UserBanner | null>('/user-banner/active');
  return data;
}

export async function getAdminUserBanner(): Promise<UserBanner> {
  const { data } = await api.get<UserBanner>('/admin/user-banner');
  return data;
}

export async function updateAdminUserBanner(payload: UpdateUserBannerPayload): Promise<UserBanner> {
  const { data } = await api.put<UserBanner>('/admin/user-banner', payload);
  return data;
}
