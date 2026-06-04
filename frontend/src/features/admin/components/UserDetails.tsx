import { useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import UserBasicBlock from './UserBasicBlock';
import AdminCEUMatrixBlock from './AdminCEUMatrixBlock';
import UserSupervisionMatrix from './UserSupervisionMatrix';
import PaymentsBlock from './PaymentsBlock';
import AdminUserGroupsBlock from '@/features/admin/components/AdminUserGroupsBlock';
import { PageNav } from '@/components/PageNav';
import { AdminCandidateSummaryBlock } from './AdminCandidateSummaryBlock';
import { AdminUserSection } from './AdminUserSection';
import { AdminAccountActionsBlock } from './AdminAccountActionsBlock';
import { AdminUserNotesModal } from './AdminUserNotesModal';
import { useUserActionLog } from '../hooks/useUserActionLog';

type SectionId =
  | 'groups'
  | 'ceu'
  | 'supervision'
  | 'payments';

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useUserDetails(id ?? '');
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isUserDataOpen, setIsUserDataOpen] = useState(false);
  const { data: actionLog = [], isLoading: notesLoading } = useUserActionLog(id ?? '');
  const notes = useMemo(
    () =>
      actionLog
        .filter((log) => log.action === 'Заметка администратора' && log.details)
        .slice()
        .reverse(),
    [actionLog],
  );

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
        <h1 className="dashboard-v2-page-title text-center">Детали кандидата</h1>
        <button
          type="button"
          className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 justify-self-end rounded-full border border-[#8D96B5] bg-white px-3 text-[16px] font-extrabold text-[#6B7894] transition hover:bg-[var(--color-blue-soft)]"
          onClick={() => setIsNotesOpen(true)}
        >
          <span>Заметки</span>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#8D96B5] px-2 text-white">
            {notes.length}
          </span>
        </button>
      </header>

      <AdminCandidateSummaryBlock user={data} activeGroupName={activeGroup} />

      <div className="space-y-4">
        <section className="rounded-[22px] bg-white px-6 py-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="dashboard-v2-title">Действия с аккаунтом</h2>
            <p className="text-[13px] font-semibold text-[#8D96B5]">
              Данные пользователя открываются отдельным окном.
            </p>
          </div>
          <AdminAccountActionsBlock
            userId={data.id}
            role={data.role}
            isProfileVisible={data.isProfileVisible}
            archivedAt={data.archivedAt}
            onOpenUserData={() => setIsUserDataOpen(true)}
          />
        </section>

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
            activeGroupName={activeGroup}
          />
        </AdminUserSection>

        <AdminUserSection
          title="Оплаты"
          isOpen={openSection === 'payments'}
          onToggle={() => toggleSection('payments')}
        >
          <PaymentsBlock
            payments={data.payments}
            userId={data.id}
            activeGroupName={activeGroup}
            activeCycle={data.activeCycle}
          />
        </AdminUserSection>

      </div>

      {isNotesOpen ? (
        <AdminUserNotesModal
          userId={data.id}
          notes={notes}
          isLoading={notesLoading}
          onClose={() => setIsNotesOpen(false)}
        />
      ) : null}

      {isUserDataOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-[960px] overflow-y-auto rounded-[22px] bg-white p-5 text-[var(--color-blue-dark)] shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="dashboard-v2-title">Данные пользователя</h3>
              <button
                type="button"
                className="btn dashboard-v2-action dashboard-v2-action-secondary"
                onClick={() => setIsUserDataOpen(false)}
              >
                Закрыть
              </button>
            </div>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
