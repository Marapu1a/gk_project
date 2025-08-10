import { api } from '@/lib/axios';

type Params = {
  search?: string;
  page?: number;
  perPage?: number;
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
      role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
      createdAt: string;
      groups: { id: string; name: string }[];
    }[];
  };
}
