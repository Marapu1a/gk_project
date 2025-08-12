import { useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';
import { Button } from '@/components/Button';
import { QualificationStatusBlock } from '@/features/certificate/components/QualificationStatusBlock';
import { UserPaymentDashboard } from '@/features/payment/components/UserPaymentDashboard';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AvatarBlock } from '@/features/files/components/AvatarBlock';

const roleLabels = {
  STUDENT: 'Ученик',
  REVIEWER: 'Супервизор',
  ADMIN: 'Администратор',
} as const;

export function UserInfo() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const { data: payments = [], isLoading: payLoading } = useUserPayments();

  if (isLoading || !user) return null;

  const isAdmin = user.role === 'ADMIN';
  const registrationPaid =
    payments.some((p) => p.type === 'REGISTRATION' && p.status === 'PAID') ||
    payments.some((p) => p.type === 'FULL_PACKAGE' && p.status === 'PAID');

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h2 className="text-xl font-semibold text-blue-dark">Информация о пользователе</h2>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-3 text-sm">
        {/* Аватар */}
        <AvatarBlock userId={user.id} avatarUrl={user.avatarUrl} readOnly={false} />

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
            <Button onClick={() => navigate('/my-certificate')} className="mt-2">
              Мой сертификат
            </Button>

            {!payLoading && (isAdmin || registrationPaid) ? (
              <QualificationStatusBlock activeGroupName={user.activeGroup?.name} />
            ) : (
              !payLoading && (
                <div
                  className="mt-3 rounded-xl p-3 text-sm"
                  style={{
                    background: 'var(--color-blue-soft)',
                    border: '1px solid rgba(31,48,94,0.2)',
                  }}
                >
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
    </div>
  );
}
