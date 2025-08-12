import { useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';
import { Button } from '@/components/Button';
import { QualificationStatusBlock } from '@/features/certificate/components/QualificationStatusBlock';
import { UserPaymentDashboard } from '@/features/payment/components/UserPaymentDashboard';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';

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

  // подтянем оплаты и посчитаем флаг регистрации
  const { data: payments = [], isLoading: payLoading } = useUserPayments();
  const isAdmin = user.role === 'ADMIN';
  const registrationPaid =
    payments.some((p) => p.type === 'REGISTRATION' && p.status === 'PAID') ||
    payments.some((p) => p.type === 'FULL_PACKAGE' && p.status === 'PAID');

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

      {isAdmin ? (
        <Button onClick={() => navigate('/admin/document-review')} className="mt-2 mr-2">
          Проверка документов
        </Button>
      ) : (
        <>
          <Button onClick={() => navigate('/document-review')} className="mt-2 mr-2">
            Загрузить документы на проверку
          </Button>

          {/* Гейт: доступ к сертификации (CEU/супервизия/экзамен) только при оплаченной регистрации или Full Package */}
          {!payLoading && (isAdmin || registrationPaid) ? (
            <QualificationStatusBlock activeGroupName={user.activeGroup?.name} />
          ) : (
            !payLoading && (
              <div className="mt-3 rounded-xl border border-blue-dark/10 bg-blue-soft/40 p-3">
                <p>
                  Доступ к сертификации откроется после оплаты{' '}
                  <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
                </p>
              </div>
            )
          )}

          <UserPaymentDashboard activeGroupName={user.activeGroup?.name || ''} />
        </>
      )}

      <Button onClick={logout} className="mt-4">
        Выйти
      </Button>
    </div>
  );
}
