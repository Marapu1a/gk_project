import { useQuery } from '@tanstack/react-query';
import { getAssignedHours } from '../api/getAssignedHours';

export type SupervisionHourWithUser = {
  id: string;
  type: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';
  record: {
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  };
};

export function useAssignedHours() {
  return useQuery<SupervisionHourWithUser[]>({
    queryKey: ['review', 'supervision'],
    queryFn: getAssignedHours,
  });
}
