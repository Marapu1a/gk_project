import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem('token');
    queryClient.clear(); // опционально: очистить кэш
    navigate('/login', { replace: true });
  };
}
