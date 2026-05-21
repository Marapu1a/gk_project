import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import UserBasicBlock from './UserBasicBlock';
import AdminCEUMatrixBlock from './AdminCEUMatrixBlock';
import UserSupervisionMatrix from './UserSupervisionMatrix';
import PaymentsBlock from './PaymentsBlock';
import DetailBlock from './DetailBlock';
import AdminUserGroupsBlock from '@/features/admin/components/AdminUserGroupsBlock';
import { PageNav } from '@/components/PageNav';
import { AdminCandidateSummaryBlock } from './AdminCandidateSummaryBlock';
import { AdminUserSection } from './AdminUserSection';
import { AdminAccountActionsBlock } from './AdminAccountActionsBlock';

type SectionId =
  | 'actions'
  | 'account'
  | 'groups'
  | 'ceu'
  | 'supervision'
  | 'payments'
  | 'files';

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useUserDetails(id ?? '');
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  if (isLoading) return <p className="text-sm text-blue-dark p-6">Загрузка…</p>;
  if (error || !data) return <p className="text-error p-6">Ошибка загрузки пользователя</p>;

  const activeGroup =
    data.groups.length > 0 ? [...data.groups].sort((a, b) => b.rank - a.rank)[0].name : null;

  const toggleSection = (section: SectionId) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 px-4 py-5 text-[var(--color-blue-dark)]">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <PageNav />
        <h1 className="dashboard-v2-page-title text-center">Панель администрирования</h1>
        <div className="hidden min-w-[150px] md:block" aria-hidden="true" />
      </header>

      <AdminCandidateSummaryBlock user={data} activeGroupName={activeGroup} />

      <div className="space-y-4">
        <AdminUserSection
          title="Действия с аккаунтом"
          isOpen={openSection === 'actions'}
          onToggle={() => toggleSection('actions')}
        >
          <AdminAccountActionsBlock
            userId={data.id}
            role={data.role}
            isProfileVisible={data.isProfileVisible}
            archivedAt={data.archivedAt}
          />
        </AdminUserSection>

        <AdminUserSection
          title="Данные пользователя"
          isOpen={openSection === 'account'}
          onToggle={() => toggleSection('account')}
        >
          <UserBasicBlock
            userId={data.id}
            registrationNumber={data.registrationNumber}
            fullName={data.fullName}
            fullNameLatin={data.fullNameLatin}
            email={data.email}
            phone={data.phone}
            birthDate={data.birthDate}
            country={data.country}
            city={data.city}
            avatarUrl={data.avatarUrl}
            role={data.role}
            createdAt={data.createdAt}
            groupName={activeGroup}
          />
        </AdminUserSection>

        <AdminUserSection
          title="Целевой уровень сертификации и группы"
          isOpen={openSection === 'groups'}
          onToggle={() => toggleSection('groups')}
        >
          <AdminUserGroupsBlock userId={data.id} />
        </AdminUserSection>

        <AdminUserSection
          title="CEU-баллы"
          isOpen={openSection === 'ceu'}
          onToggle={() => toggleSection('ceu')}
        >
          <AdminCEUMatrixBlock
            userId={data.id}
            required={data.examReadiness?.ceu.required}
          />
        </AdminUserSection>

        <AdminUserSection
          title="Часы практики и супервизии"
          isOpen={openSection === 'supervision'}
          onToggle={() => toggleSection('supervision')}
        >
          <UserSupervisionMatrix
            userId={data.id}
            isSupervisor={activeGroup === 'Супервизор' || activeGroup === 'Опытный Супервизор'}
          />
        </AdminUserSection>

        <AdminUserSection
          title="Оплаты"
          isOpen={openSection === 'payments'}
          onToggle={() => toggleSection('payments')}
        >
          <PaymentsBlock payments={data.payments} userId={data.id} activeGroupName={activeGroup} />
        </AdminUserSection>

        <AdminUserSection
          title="Загруженные файлы"
          isOpen={openSection === 'files'}
          onToggle={() => toggleSection('files')}
        >
          <DetailBlock title="Загруженные файлы" items={data.uploadedFiles} userId={data.id} />
        </AdminUserSection>
      </div>
    </div>
  );
}
