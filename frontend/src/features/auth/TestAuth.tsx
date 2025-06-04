import { useAuth } from '@/contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function TestAuth() {
  const { token, logout } = useAuth();

  if (!token) {
    return (
      <div className="p-6">
        <p>Вы не авторизованы</p>
      </div>
    );
  }

  const { userId, role } = jwtDecode<{ userId: string; role: string }>(token);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">ЦС ПАП</h1>
      <p>
        Вы вошли как <strong>{userId}</strong> ({role})
      </p>
      <button
        onClick={logout}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Выйти
      </button>
    </div>
  );
}
