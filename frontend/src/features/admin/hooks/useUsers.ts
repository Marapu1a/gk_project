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
  avatarUrl?: string | null;
  fullNameLatin?: string | null;
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
  perPage?: number;
  role?: string;
  group?: string;

  // режим подбора для часов
  // practice — практика → супервизоры, опытные, админы
  // mentor   — менторство → опытные, админы
  supervision?: 'practice' | 'mentor';
};

export function useUsers(params: Params) {
  const {
    search = '',
    page = 1,
    perPage = 20,
    role,
    group,
    supervision,
  } = params;

  return useQuery<UsersResponse, Error>({
    queryKey: ['users', search, page, perPage, role ?? '', group ?? '', supervision ?? ''],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: {
          search,
          page,
          perPage,
          role,
          group,
          supervision,
        },
      });
      return data as UsersResponse;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
