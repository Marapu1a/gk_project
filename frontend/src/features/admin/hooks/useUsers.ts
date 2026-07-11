// src/features/admin/hooks/useUsers.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';

type Role = 'ADMIN' | 'STUDENT' | 'REVIEWER';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  registrationNumber?: string | null;
  phone?: string | null;
  role: Role;
  createdAt: string;
  lastActiveAt?: string | null;
  groups: { id: string; name: string; rank?: number | null }[];
  avatarUrl?: string | null;
  fullNameLatin?: string | null;
  archivedAt?: string | null;
  archiveRequestedAt?: string | null;
  archiveRequestReason?: string | null;
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
  registeredFrom?: string;
  registeredTo?: string;
  status?: 'ACTIVE' | 'ARCHIVE_REQUESTED' | 'ARCHIVED' | 'ALL';

  // режим подбора для часов
  // practice — практика → супервизоры, опытные, админы
  // mentor   — менторство → опытные, админы
  supervision?: 'practice' | 'mentor';
  archived?: 'active' | 'only' | 'with';
  nameSort?: 'asc' | 'desc';
};

export function useUsers(params: Params) {
  const {
    search = '',
    page = 1,
    perPage = 20,
    role,
    group,
    registeredFrom = '',
    registeredTo = '',
    status,
    supervision,
    archived = 'active',
    nameSort,
  } = params;

  return useQuery<UsersResponse, Error>({
    queryKey: [
      'users',
      search,
      page,
      perPage,
      role ?? '',
      group ?? '',
      registeredFrom,
      registeredTo,
      status ?? '',
      supervision ?? '',
      archived,
      nameSort ?? '',
    ],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: {
          search,
          page,
          perPage,
          role,
          group,
          registeredFrom,
          registeredTo,
          status,
          supervision,
          archived,
          nameSort,
        },
      });
      return data as UsersResponse;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
