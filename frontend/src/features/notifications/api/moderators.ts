import { api } from '@/lib/axios';

export type Moderator = {
  role: string;
  id: string;
  fullName: string;
  email: string;
};

export async function getModerators(): Promise<Moderator[]> {
  const res = await api.get('/moderators');
  return res.data;
}
