import { useEffect } from 'react';

// src/features/dashboard/components/UserInfo.tsx
interface User {
  fullName: string;
  email: string;
  role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
  activeGroup: { name: string };
}

const roleLabels: Record<User['role'], string> = {
  STUDENT: 'Ученик',
  REVIEWER: 'Супервизор',
  ADMIN: 'Администратор',
};

export function UserInfo({ user }: { user: User }) {
  useEffect(() => {
    console.log(user);
  });
  return (
    <div className="border p-4 rounded shadow-sm">
      <h2 className="text-xl font-semibold mb-2 text-blue-dark">Информация о пользователе</h2>
      <p className="mb-1">
        <strong>Имя:</strong> {user.fullName}
      </p>
      <p className="mb-1">
        <strong>Email:</strong> {user.email}
      </p>
      <p className="mb-1">
        <strong>Роль:</strong> {roleLabels[user.role] || user.role}
      </p>
      <p className="mb-1">
        <strong>Группа:</strong> {user.activeGroup?.name || '—'}
      </p>

      <button
        className="btn btn-brand mt-4"
        onClick={() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }}
      >
        Выйти
      </button>
    </div>
  );
}
