import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { UserInfo } from './UserInfo';
import { ProgressSummary } from './ProgressSummary';
import { DashboardTabs } from './DashboardTabs';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationModal } from '@/features/notifications/components/NotificationModal';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useUserPayments();
  const [openNotif, setOpenNotif] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const registrationPaid = useMemo(() => {
    const paid = (t: 'REGISTRATION' | 'FULL_PACKAGE') =>
      payments.some((p) => p.type === t && p.status === 'PAID');
    return paid('REGISTRATION') || paid('FULL_PACKAGE');
  }, [payments]);

  if (isLoading || paymentsLoading) return <p>Загрузка...</p>;
  if (isError || !user) return <p className="text-error">Не удалось загрузить данные</p>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-end">
        <NotificationBell onClick={() => setOpenNotif(true)} />
      </div>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />

      <h1 className="text-3xl font-bold text-blue-dark">Личный кабинет</h1>

      {isAdmin || registrationPaid ? (
        <DashboardTabs user={user} />
      ) : (
        <div className="bg-blue-soft border border-blue-dark/20 rounded-xl p-4">
          <p className="text-sm">
            Для доступа к функциям сертификации нужна оплата{' '}
            <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
          </p>
          <div className="mt-2">
            <Link to="/payments" className="text-brand hover:underline">
              Перейти к оплате
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <UserInfo user={user} />
        </div>

        {isAdmin || registrationPaid ? (
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <ProgressSummary />
          </div>
        ) : (
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">
              Прогресс сертификации станет доступен после оплаты регистрации.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
