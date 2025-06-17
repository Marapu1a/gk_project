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
  return (
    <div className="space-y-2 text-sm">
      <h2 className="text-xl font-semibold mb-2 text-blue-dark">Информация о пользователе</h2>
      <p>
        <strong>Имя:</strong> {user.fullName}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Роль:</strong> {roleLabels[user.role] || user.role}
      </p>
      <p>
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
