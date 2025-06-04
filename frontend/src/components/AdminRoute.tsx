import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';

export function AdminRoute() {
  const { token } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  const { role } = jwtDecode<{ role: string }>(token);

  return role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
