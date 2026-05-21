import { useQuery } from '@tanstack/react-query';
import { getUserActionLog } from '../api/getUserActionLog';

export function useUserActionLog(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'user', 'action-log', userId],
    queryFn: () => getUserActionLog(userId),
    enabled: enabled && Boolean(userId),
  });
}
