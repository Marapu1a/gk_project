import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { UserInfo } from './UserInfo';
import { ProgressSummary } from './ProgressSummary';
import { DashboardTabs } from './DashboardTabs';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationModal } from '@/features/notifications/components/NotificationModal';

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

  function scrollToBottomAndHighlight() {
    const root = document.scrollingElement as HTMLElement | null;
    const bottom = document.getElementById('page-bottom');
    if (!root || !bottom) return;

    // когда докрутили до низа — шлём событие
    const io = new IntersectionObserver(
      (entries, o) => {
        if (entries.some((e) => e.isIntersecting)) {
          o.disconnect();
          window.dispatchEvent(new CustomEvent('highlight-payments'));
        }
      },
      { threshold: 0.01 },
    );

    io.observe(bottom);
    root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' });
  }

  const { data: payments = [], isLoading: paymentsLoading } = useUserPayments();
  const [openNotif, setOpenNotif] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const registrationPaid = useMemo(() => {
    const paid = (t: 'REGISTRATION' | 'FULL_PACKAGE') =>
      payments.some((p) => p.type === t && p.status === 'PAID');
    return paid('REGISTRATION') || paid('FULL_PACKAGE');
  }, [payments]);

  if (isLoading || paymentsLoading) {
    return (
      <div className="container-fixed p-6">
        <div
          className="w-full max-w-3xl rounded-2xl border header-shadow bg-white p-6 text-sm text-blue-dark"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          Загрузка…
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed p-6">
        <div
          className="w-full max-w-3xl rounded-2xl border header-shadow bg-white p-6"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <p className="text-error">Не удалось загрузить данные</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed p-6 space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl border header-shadow bg-white"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <h1 className="text-2xl font-semibold text-blue-dark">Личный кабинет</h1>
          <NotificationBell onClick={() => setOpenNotif(true)} />
        </div>

        {!isAdmin && !registrationPaid && (
          <div className="px-6 py-4">
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--color-blue-soft)',
                border: '1px solid rgba(31,48,94,0.2)',
              }}
            >
              <p className="text-sm">
                Для доступа к функциям сертификации нужна оплата{' '}
                <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
              </p>
              <button className="text-brand hover:underline" onClick={scrollToBottomAndHighlight}>
                Перейти к оплате
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {(isAdmin || registrationPaid) && <DashboardTabs user={user} />}

      {/* Info + Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserInfo />

        {isAdmin || registrationPaid ? (
          <ProgressSummary />
        ) : (
          <div
            className="rounded-2xl border header-shadow bg-white p-6"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <p className="text-sm text-gray-600">
              Прогресс сертификации станет доступен после оплаты регистрации.
            </p>
          </div>
        )}
      </div>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />
      <div id="page-bottom" style={{ height: 1 }} />
    </div>
  );
}
