import { api } from '@/lib/axios';

type Params = {
  search?: string;
  page?: number;
  perPage?: number;

  // режим подбора ревьюера для часов
  // practice — часы практики (супервизор / опытный / админ)
  // mentor   — менторские часы (только опытный / админ)
  supervision?: 'practice' | 'mentor';
};

export async function getUsers(params: Params) {
  const response = await api.get('/admin/users', { params });

  return response.data as {
    total: number;
    page: number;
    perPage: number;
    users: {
      id: string;
      email: string;
      fullName: string;
      fullNameLatin?: string | null;
      role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
      createdAt: string;
      avatarUrl?: string | null;
      groups: { id: string; name: string }[];
    }[];
  };
}
