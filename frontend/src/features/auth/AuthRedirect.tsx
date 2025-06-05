import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';
import Loader from '@/components/Loader';

export default function AuthRedirect() {
  const { token, isInitialized } = useAuth();

  if (!isInitialized) return <Loader />;

  if (!token) return <Navigate to="/register" replace />;

  try {
    const { role } = jwtDecode<{ role: string }>(token);

    return role === 'ADMIN' ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  } catch (err) {
    console.error('[REDIRECT ERROR]', err);
    return <Navigate to="/register" replace />;
  }
}
