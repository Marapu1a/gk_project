// src/features/dashboard/components/Dashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { UserInfo } from './UserInfo';
import { ProgressSummary } from './ProgressSummary';
import { DashboardTabs } from './DashboardTabs';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationModal } from '@/features/notifications/components/NotificationModal';

export function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const handleReauth = () => {
    localStorage.removeItem('token');
    qc.removeQueries();
    navigate('/login?to=/dashboard', { replace: true });
  };

  function scrollToBottomAndHighlight() {
    const root = document.scrollingElement as HTMLElement | null;
    const bottom = document.getElementById('page-bottom');
    if (!root || !bottom) return;

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
          <button onClick={handleReauth} className="text-error">
            Не удалось загрузить данные, вы авторизованы? (кликните для авторизации)
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';
  const activeCycleType = user.activeCycle?.type ?? null;
  const isRenewalCycle = activeCycleType === 'RENEWAL';

  const registrationPaid =
    payments.some((p) => p.type === 'REGISTRATION' && p.status === 'PAID') ||
    payments.some((p) => p.type === 'FULL_PACKAGE' && p.status === 'PAID');

  const renewalPaid = payments.some(
    (p) =>
      p.type === 'RENEWAL' &&
      p.status === 'PAID' &&
      (!user.targetLevel || p.targetLevel === user.targetLevel),
  );

  const hasRequiredPayment = isRenewalCycle ? renewalPaid : registrationPaid;

  const isSupervisorLike =
    user.activeGroup?.name === 'Супервизор' || user.activeGroup?.name === 'Опытный Супервизор';

  const hasTargetLevel = !!user.targetLevel;

  const canShowProgress = isAdmin || (hasRequiredPayment && (hasTargetLevel || isSupervisorLike));

  return (
    <div className="container-fixed p-6 space-y-6">
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

        <div className="px-6 py-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--color-blue-soft)',
              border: '1px solid rgba(31,48,94,0.2)',
            }}
          >
            <p className="text-sm text-blue-dark">
              Уважаемые пользователи! Произошло обновление реестра и кабинета пользователей. Просьба
              отредактировать ваши личные данные. Будем благодарны за обратную связь, просьба все
              ваши замечания и пожелания по работе кабинета отправлять на почту{' '}
              <a href="mailto:CSPAP@yandex.ru" className="underline hover:no-underline">
                CSPAP@yandex.ru
              </a>
              .
            </p>
          </div>
        </div>

        {!isAdmin && !hasRequiredPayment && (
          <div className="px-6 py-4">
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--color-blue-soft)',
                border: '1px solid rgba(31,48,94,0.2)',
              }}
            >
              <p className="text-sm">
                {isRenewalCycle ? (
                  <>
                    Для доступа к функциям ресертификации нужна оплата{' '}
                    <strong>«Ресертификация»</strong>.
                  </>
                ) : (
                  <>
                    Для доступа к функциям сертификации нужна оплата{' '}
                    <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
                  </>
                )}
              </p>
              <button className="text-brand hover:underline" onClick={scrollToBottomAndHighlight}>
                Перейти к оплате
              </button>
            </div>
          </div>
        )}
      </div>

      {(isAdmin || hasRequiredPayment) && <DashboardTabs user={user} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserInfo />

        {canShowProgress ? (
          <ProgressSummary />
        ) : (
          <div
            className="rounded-2xl border header-shadow bg-white p-6"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <p className="text-sm text-gray-600">
              {isRenewalCycle
                ? 'Прогресс ресертификации станет доступен после оплаты ресертификации.'
                : `Прогресс сертификации станет доступен после оплаты регистрации${
                    isSupervisorLike
                      ? '.'
                      : ' и выбора цели сертификации (Инструктор / Куратор / Супервизор).'
                  }`}
            </p>
          </div>
        )}
      </div>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />
      <div id="page-bottom" style={{ height: 1 }} />
    </div>
  );
}
