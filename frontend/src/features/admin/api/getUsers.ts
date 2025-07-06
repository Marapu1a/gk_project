import { api } from '@/lib/axios';

export type UserItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  groups: { id: string; name: string }[];
};

export type GetUsersResponse = {
  total: number;
  page: number;
  perPage: number;
  users: UserItem[];
};

export async function getUsers(params: {
  role?: string;
  group?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}
