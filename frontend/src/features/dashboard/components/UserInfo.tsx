import { useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';
import { Button } from '@/components/Button';
import { QualificationStatusBlock } from '@/features/certificate/components/QualificationStatusBlock';
import { UserPaymentDashboard } from '@/features/payment/components/UserPaymentDashboard';

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
  const logout = useLogout();
  const navigate = useNavigate();

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

      {user.role === 'ADMIN' ? (
        <Button onClick={() => navigate('/admin/document-review')} className="mt-2 mr-2">
          Проверка документов
        </Button>
      ) : (
        <Button onClick={() => navigate('/document-review')} className="mt-2 mr-2">
          Загрузить документы на проверку
        </Button>
      )}

      <Button onClick={logout} className="mt-4">
        Выйти
      </Button>

      <QualificationStatusBlock activeGroupName={user.activeGroup?.name} />
      <UserPaymentDashboard activeGroupName={user.activeGroup?.name || ''} />
    </div>
  );
}
