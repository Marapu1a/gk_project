import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { ProfileCard } from './info/profile-card/component/ProfileCard';
import { PaymentBlock } from './payment/component/PaymentBlock';
import { CertificationBlock } from './certification-block/component/CertificationBlock';
import { HoursOverviewBlock } from './hours-overview/component/HoursOverviewBlock';
import { CeuOverviewBlock } from './ceu-overview/component/CeuOverviewBlock';
import { ReviewerCandidatesBlocks } from './reviewer-candidates/component/ReviewerCandidatesBlocks';

const TARGET_LEVEL_LABELS = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

export function DashboardV2() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const { data: payments = [], isLoading: paymentsLoading } = useUserPayments();

  if (isLoading || paymentsLoading) {
    return (
      <div className="container-fixed p-6">
        <p className="text-sm text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed p-6">
        <p className="text-sm text-error">Не удалось загрузить дашборд</p>
      </div>
    );
  }

  const activeGroupName = user.activeGroup?.name ?? '';
  const targetLevelName = user.targetLevel ? TARGET_LEVEL_LABELS[user.targetLevel] : undefined;
  const isAdmin = user.role === 'ADMIN';
  const isRenewalCycle = user.activeCycle?.type === 'RENEWAL';
  const registrationPaid =
    payments.some((payment) => payment.type === 'REGISTRATION' && payment.status === 'PAID') ||
    payments.some((payment) => payment.type === 'FULL_PACKAGE' && payment.status === 'PAID');

  // Повторяет текущую продовую логику: для ресертификации проверка оплаты временно отключена.
  const hasRequiredPayment = isRenewalCycle ? true : registrationPaid;
  const canUseCertificationContent = isAdmin || hasRequiredPayment;

  return (
    <div className="container-fixed p-6">
      <div className="space-y-6">
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
            <HoursOverviewBlock />

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
      <div className="rounded-[14px] bg-[#E5EFF1] px-5 py-5 text-[#1F305E]">
        <h2 className="dashboard-v2-title mb-3">Доступ к функциям сертификации закрыт</h2>
        <p className="max-w-[760px] text-[14px] leading-[1.45]">
          Для доступа к функциям сертификации нужна оплата{' '}
          <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
          После подтверждения оплаты администратором вы сможете добавлять CEU-баллы и отправлять
          часы практики супервизору.
        </p>
      </div>
    </section>
  );
}
