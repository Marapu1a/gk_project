// src/features/admin/hooks/useUsers.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';

type Role = 'ADMIN' | 'STUDENT' | 'REVIEWER';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  groups: { id: string; name: string }[];
  avatarUrl?: string | null;      // 👈 аватар
  fullNameLatin?: string | null;  // 👈 если вдруг пригодится где-то ещё
};

type UsersResponse = {
  total: number;
  page: number;
  perPage: number;
  users: UserRow[];
};

type Params = {
  search?: string;
  page?: number;
  perPage?: number; // бек всё равно обрежет до 100
  role?: string;
  group?: string;
};

export function useUsers(params: Params) {
  const { search = '', page = 1, perPage = 20, role, group } = params;

  return useQuery<UsersResponse, Error>({
    // стабильный ключ без лишних объектов
    queryKey: ['users', search, page, perPage, role ?? '', group ?? ''],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: { search, page, perPage, role, group },
      });
      return data as UsersResponse;
    },
    // аналог старого keepPreviousData: true
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
