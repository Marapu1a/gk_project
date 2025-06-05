import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';

export function ProtectedRoute() {
  const { token, isInitialized } = useAuth();

  if (!isInitialized) return <Loader />; // или null

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
