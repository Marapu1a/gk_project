import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { TransborderConsentModal } from '@/features/auth/components/TransborderConsentModal';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { ProfileCard } from './info/profile-card/component/ProfileCard';
import { PaymentBlock } from './payment/component/PaymentBlock';
import { CertificationBlock } from './certification-block/component/CertificationBlock';
import { HoursOverviewBlock } from './hours-overview/component/HoursOverviewBlock';
import { CeuOverviewBlock } from './ceu-overview/component/CeuOverviewBlock';
import { ReviewerCandidatesBlocks } from './reviewer-candidates/component/ReviewerCandidatesBlocks';
import { AdminDashboard } from './admin-dashboard/AdminDashboard';
import { UserDashboardBanner } from '@/features/userBanner/components/UserDashboardBanner';
import { DashboardGuidance } from '@/features/dashboard-guidance';

const TARGET_LEVEL_LABELS = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

export function DashboardV2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useCurrentUser();

  const handleReauth = () => {
    localStorage.removeItem('token');
    queryClient.removeQueries();
    navigate('/login?to=/dashboard-v2', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="container-fixed p-6">
        <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed p-6">
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
    </>
  );
}

function UserDashboardV2({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>['data']> }) {
  const { data: payments = [], isLoading: paymentsLoading } = useUserPayments();

  if (paymentsLoading) {
    return (
      <div className="container-fixed p-6">
        <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  const activeGroupName = user.activeGroup?.name ?? '';
  const targetLevelName = user.targetLevel ? TARGET_LEVEL_LABELS[user.targetLevel] : undefined;
  const isRenewalCycle = user.activeCycle?.type === 'RENEWAL';
  const isBasicSupervisor = activeGroupName === 'Супервизор';
  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';
  const canReviewCandidates = isBasicSupervisor || isExperiencedSupervisor;
  const registrationPaid =
    payments.some((payment) => payment.type === 'REGISTRATION' && payment.status === 'PAID') ||
    payments.some((payment) => payment.type === 'FULL_PACKAGE' && payment.status === 'PAID');

  // Повторяет текущую продовую логику: для ресертификации проверка оплаты временно отключена.
  const hasRequiredPayment = isRenewalCycle ? true : registrationPaid;
  const canUseCertificationContent = hasRequiredPayment;

  // Claim активен пока не SETUP_COMPLETE/REJECTED — оплата и доступ к функциям не актуальны.
  const claimStatus = user.externalSupervisorClaimStatus;
  const isExternalClaimActive = claimStatus === 'PENDING' || claimStatus === 'APPROVED';

  return (
    <div className="container-fixed p-6">
      <div className="space-y-6">
        <UserDashboardBanner />
        <DashboardGuidance user={user} hasCertificationAccess={canUseCertificationContent} />

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
          <div id="dashboard-certification" className="flex min-w-0 scroll-mt-6">
            <CertificationBlock user={user} />
          </div>

          <div id="dashboard-payments" className="flex min-w-0 scroll-mt-6">
            <PaymentBlock
              activeGroupName={activeGroupName}
              targetLevel={user.targetLevel ?? null}
              targetLevelName={targetLevelName}
              cycleType={user.activeCycle?.type ?? null}
              externalClaimActive={isExternalClaimActive}
            />
          </div>

          <div className="flex min-w-0">
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

        {canUseCertificationContent ? (
          <>
            {!isExperiencedSupervisor ? (
              <HoursOverviewBlock forceMentorship={isBasicSupervisor} />
            ) : null}

            <CeuOverviewBlock level={user.targetLevel} />
          </>
        ) : (
          <CertificationAccessPlaceholder externalClaimActive={isExternalClaimActive} />
        )}

        {canReviewCandidates ? (
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
              Для доступа к функциям сертификации нужна оплата{' '}
              <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
              После подтверждения оплаты администратором вы сможете добавлять CEU-баллы и отправлять
              часы практики супервизору.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
