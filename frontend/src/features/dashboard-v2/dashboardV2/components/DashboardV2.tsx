import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { TransborderConsentModal } from '@/features/auth/components/TransborderConsentModal';
import {
  CertificateIssuedModal,
  type CertificateIssuedReport,
} from '@/features/certificate/components/CertificateIssuedModal';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useSpecialistContactMessages } from '@/features/registry/hooks/useSpecialistContactMessages';
import { NotificationBellButton } from '@/features/notifications/components/NotificationBellButton';
import { MobileBackHeader } from '@/components/MobileBackHeader';
import { ProfileCard } from './info/profile-card/component/ProfileCard';
import { PaymentBlock } from './payment/component/PaymentBlock';
import { CertificationBlock } from './certification-block/component/CertificationBlock';
import { HoursOverviewBlock } from './hours-overview/component/HoursOverviewBlock';
import { CeuOverviewBlock } from './ceu-overview/component/CeuOverviewBlock';
import { ReviewerCandidatesBlocks } from './reviewer-candidates/component/ReviewerCandidatesBlocks';
import { DashboardNavRow } from './DashboardNavRow';
import { EditIcon } from './info/profile-card/icons/EditIcon';
import { MailIcon } from './info/profile-card/icons/MailIcon';
import { LogoutIcon } from './info/profile-card/icons/LogoutIcon';
import { AdminDashboard } from './admin-dashboard/AdminDashboard';
import { UserDashboardBanner } from '@/features/userBanner/components/UserDashboardBanner';
import { DashboardGuidance } from '@/features/dashboard-guidance';
import { useDashboardGuidanceVisible } from '@/features/dashboard-guidance/hooks/useDashboardGuidanceVisible';
import { hasCertificationAccessPayment } from '@/features/payment/model/paymentPolicy';
import { resolveDashboardSections } from '@/features/dashboard-v2/model/dashboardSections';

const TARGET_LEVEL_LABELS = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

export function DashboardV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useCurrentUser();

  // Отчёт о выдаче сертификата прилетает через router-state со страницы выдачи.
  const [certificateReport, setCertificateReport] = useState<CertificateIssuedReport | null>(
    () => (location.state as { certificateIssued?: CertificateIssuedReport } | null)?.certificateIssued ?? null,
  );

  // Гасим router-state, чтобы при refresh/возврате модалка не всплывала повторно.
  useEffect(() => {
    if ((location.state as { certificateIssued?: CertificateIssuedReport } | null)?.certificateIssued) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReauth = () => {
    localStorage.removeItem('token');
    queryClient.removeQueries();
    navigate('/login?to=/dashboard-v2', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="container-fixed px-2 py-6 sm:px-6">
        <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed px-2 py-6 sm:px-6">
        <section className="card-section max-w-3xl px-5 py-5 shadow-soft">
          <button
            type="button"
            onClick={handleReauth}
            className="dashboard-v2-text cursor-pointer text-error underline underline-offset-4 transition hover:opacity-80"
          >
            Не удалось загрузить данные. Нажмите, чтобы войти заново.
          </button>
        </section>
      </div>
    );
  }

  const shouldShowTransborderConsentModal = Boolean(
    user.transborderConsent?.required && !user.transborderConsent?.accepted,
  );

  const content =
    user.role === 'ADMIN' ? (
      <AdminDashboard user={{ email: user.email }} />
    ) : (
      <UserDashboardV2 user={user} />
    );

  return (
    <>
      {content}

      <TransborderConsentModal
        open={shouldShowTransborderConsentModal}
        source="LEGACY_MODAL"
        onAccepted={() => {}}
        onLogout={handleReauth}
      />

      {certificateReport ? (
        <CertificateIssuedModal
          report={certificateReport}
          onClose={() => setCertificateReport(null)}
        />
      ) : null}
    </>
  );
}

function UserDashboardV2({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>['data']> }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: payments = [], isLoading: paymentsLoading } = useUserPayments();
  const { data: contactMessages } = useSpecialistContactMessages();
  const { visible: guidanceVisible, hide: hideGuidance, show: showGuidance } = useDashboardGuidanceVisible();
  const [mobilePaymentOpen, setMobilePaymentOpen] = useState(false);

  const activeGroupName = user.activeGroup?.name ?? '';
  const unreadContactCount = contactMessages?.unreadCount ?? 0;

  if (paymentsLoading) {
    return (
      <div className="container-fixed px-2 py-6 sm:px-6">
        <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  const targetLevelName = user.targetLevel ? TARGET_LEVEL_LABELS[user.targetLevel] : undefined;
  const isRenewalCycle = user.activeCycle?.type === 'RENEWAL';
  // Для ресертификации текущая продуктовая логика не блокирует формы до оплаты.
  const canUseCertificationContent = hasCertificationAccessPayment(
    payments,
    isRenewalCycle ? 'RENEWAL' : 'CERTIFICATION',
    user.targetLevel,
  );
  const sections = resolveDashboardSections({
    activeGroupName,
    hasCertificationAccess: canUseCertificationContent,
  });

  // Claim активен пока не SETUP_COMPLETE/REJECTED — оплата и доступ к функциям не актуальны.
  const claimStatus = user.externalSupervisorClaimStatus;
  const isExternalClaimActive = claimStatus === 'PENDING' || claimStatus === 'APPROVED';

  if (mobilePaymentOpen) {
    return (
      <div className="container-fixed p-4 lg:hidden">
        <MobileBackHeader title="Оплата" onBack={() => setMobilePaymentOpen(false)} />
        <PaymentBlock
          activeGroupName={activeGroupName}
          targetLevel={user.targetLevel ?? null}
          targetLevelName={targetLevelName}
          cycleType={user.activeCycle?.type ?? null}
          externalClaimActive={isExternalClaimActive}
        />
      </div>
    );
  }

  return (
    <div className="container-fixed px-2 py-6 sm:px-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <h1 className="dashboard-v2-title">Личный кабинет</h1>

          <div className="flex items-center gap-2">
            <NotificationBellButton className="icon-button icon-button-primary relative h-9 w-9" />

            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Редактировать личную информацию"
              title="Редактировать личную информацию"
              className="icon-button icon-button-primary h-9 w-9"
            >
              <EditIcon className="h-full w-full" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/specialist-messages')}
              aria-label="Обращения с сайта реестра"
              title="Обращения с сайта реестра"
              className="icon-button icon-button-primary relative h-9 w-9"
            >
              <MailIcon className="h-full w-full" />

              {unreadContactCount > 0 && (
                <span className="badge badge-danger absolute -right-1 -top-1">
                  {unreadContactCount > 99 ? '99+' : unreadContactCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              aria-label="Выйти"
              title="Выход"
              className="icon-button icon-button-danger h-9 w-9"
            >
              <LogoutIcon className="h-full w-full" />
            </button>
          </div>
        </div>

        <UserDashboardBanner />
        {guidanceVisible ? (
          <DashboardGuidance
            user={user}
            hasCertificationAccess={canUseCertificationContent}
            onHide={hideGuidance}
          />
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={showGuidance}
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#B8C0D1] shadow-soft transition hover:text-[#7F8AA3]"
              title="Показать подсказки"
            >
              <Eye size={13} strokeWidth={2} />
              Подсказки
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
          <div id="dashboard-certification" className="flex min-w-0 scroll-mt-6">
            <CertificationBlock user={user} onOpenPayment={() => setMobilePaymentOpen(true)} />
          </div>

          <div id="dashboard-payments" className="hidden min-w-0 scroll-mt-6 lg:flex">
            <PaymentBlock
              activeGroupName={activeGroupName}
              targetLevel={user.targetLevel ?? null}
              targetLevelName={targetLevelName}
              cycleType={user.activeCycle?.type ?? null}
              externalClaimActive={isExternalClaimActive}
            />
          </div>

          <div className="order-first flex min-w-0 lg:order-none">
            <ProfileCard
              user={{
                id: user.id,
                email: user.email,
                registrationNumber: user.registrationNumber,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                groupName: activeGroupName,
                targetLevelName,
              }}
            />
          </div>
        </div>

        {sections.showCertificationContent ? (
          <>
            {/* Десктоп/планшет — полные блоки */}
            <div className="hidden lg:block lg:space-y-6">
              {sections.hoursMode ? (
                <HoursOverviewBlock forceMentorship={sections.hoursMode === 'mentorship'} />
              ) : null}

              {sections.showCeu ? <CeuOverviewBlock level={user.targetLevel} /> : null}
            </div>

            {/* Мобильная версия — компактные строки-ссылки */}
            <div className="space-y-2 lg:hidden">
              {sections.hoursMode ? (
                <DashboardNavRow
                  label={sections.hoursMode === 'mentorship' ? 'Часы менторства' : 'Часы супервизии'}
                  onClick={() => navigate('/supervision/hours')}
                />
              ) : null}

              {sections.showCeu ? (
                <DashboardNavRow label="CEU-Баллы" onClick={() => navigate('/ceu/points')} />
              ) : null}
            </div>
          </>
        ) : (
          <CertificationAccessPlaceholder externalClaimActive={isExternalClaimActive} />
        )}

        {sections.showReviewerWork ? (
          <div id="dashboard-reviewer-work" className="scroll-mt-6">
            <ReviewerCandidatesBlocks />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CertificationAccessPlaceholder({ externalClaimActive }: { externalClaimActive?: boolean }) {
  return (
    <section className="card-section overflow-hidden px-5 py-5 shadow-soft">
      <div className="rounded-[14px] bg-[var(--color-blue-soft)] px-5 py-5 text-[#1F305E]">
        {externalClaimActive ? (
          <>
            <h2 className="dashboard-v2-title mb-3">Функции сертификации временно недоступны</h2>
            <p className="dashboard-v2-text max-w-[760px]">
              Доступ к часам практики и CEU-баллам откроется после того, как администратор
              подтвердит вашу квалификацию и настроит ваш профиль.
            </p>
          </>
        ) : (
          <>
            <h2 className="dashboard-v2-title mb-3">Доступ к функциям сертификации закрыт</h2>
            <p className="dashboard-v2-text max-w-[760px]">
              Для доступа к функциям сертификации нужна подтвержденная оплата первого платежа или
              полного пакета. После подтверждения оплаты администратором вы сможете добавлять
              CEU-баллы и отправлять часы практики супервизору.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
