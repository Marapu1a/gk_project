// src/features/admin/hooks/useUserTypeahead.ts
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, type UserSuggestion } from '../api/searchUsers';

type Options = {
  minLength?: number;   // от скольки символов искать
  limit?: number;       // сколько подсказок вернуть
  debounceMs?: number;  // дебаунс ввода
};

export function useUserTypeahead(query: string, opts: Options = {}) {
  const { minLength = 2, limit = 8, debounceMs = 200 } = opts;

  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const enabled = debounced.trim().length >= minLength;
  const q = debounced.trim();

  return useQuery<UserSuggestion[]>({
    queryKey: ['admin', 'users', 'search', q, limit],
    queryFn: ({ signal }) => searchUsers(q, limit, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
