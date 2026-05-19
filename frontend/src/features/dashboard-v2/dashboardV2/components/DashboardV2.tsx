import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { ProfileCard } from './info/profile-card/component/ProfileCard';
import { PaymentBlock } from './payment/component/PaymentBlock';
import { CertificationBlock } from './certification-block/component/CertificationBlock';
import { HoursOverviewBlock } from './hours-overview/component/HoursOverviewBlock';
import { CeuOverviewBlock } from './ceu-overview/component/CeuOverviewBlock';
import { ReviewerCandidatesBlocks } from './reviewer-candidates/component/ReviewerCandidatesBlocks';
import { AdminDashboard } from './admin-dashboard/AdminDashboard';
import { UserDashboardBanner } from '@/features/userBanner/components/UserDashboardBanner';

const TARGET_LEVEL_LABELS = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

export function DashboardV2() {
  const { data: user, isLoading, isError } = useCurrentUser();

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
        <p className="dashboard-v2-text text-error">Не удалось загрузить дашборд</p>
      </div>
    );
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={{ email: user.email }} />;
  }

  return <UserDashboardV2 user={user} />;
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
  const registrationPaid =
    payments.some((payment) => payment.type === 'REGISTRATION' && payment.status === 'PAID') ||
    payments.some((payment) => payment.type === 'FULL_PACKAGE' && payment.status === 'PAID');

  // Повторяет текущую продовую логику: для ресертификации проверка оплаты временно отключена.
  const hasRequiredPayment = isRenewalCycle ? true : registrationPaid;
  const canUseCertificationContent = hasRequiredPayment;

  return (
    <div className="container-fixed p-6">
      <div className="space-y-6">
        <UserDashboardBanner />

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
          <div className="flex min-w-0">
            <CertificationBlock user={user} />
          </div>

          <div className="flex min-w-0">
            <PaymentBlock
              activeGroupName={activeGroupName}
              targetLevel={user.targetLevel ?? null}
              targetLevelName={targetLevelName}
              cycleType={user.activeCycle?.type ?? null}
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

            <ReviewerCandidatesBlocks />
          </>
        ) : (
          <CertificationAccessPlaceholder />
        )}
      </div>
    </div>
  );
}

function CertificationAccessPlaceholder() {
  return (
    <section className="card-section overflow-hidden px-5 py-5 shadow-soft">
      <div className="rounded-[14px] bg-[var(--color-blue-soft)] px-5 py-5 text-[#1F305E]">
        <h2 className="dashboard-v2-title mb-3">Доступ к функциям сертификации закрыт</h2>
        <p className="dashboard-v2-text max-w-[760px]">
          Для доступа к функциям сертификации нужна оплата{' '}
          <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
          После подтверждения оплаты администратором вы сможете добавлять CEU-баллы и отправлять
          часы практики супервизору.
        </p>
      </div>
    </section>
  );
}
