import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute() {
  const { token, isInitialized } = useAuth();

  if (!isInitialized) return null; // или <Loader />

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
