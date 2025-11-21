import { useParams } from 'react-router-dom';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import UserBasicBlock from './UserBasicBlock';
import AdminCEUMatrixBlock from './AdminCEUMatrixBlock';
import UserSupervisionMatrix from './UserSupervisionMatrix';
import PaymentsBlock from './PaymentsBlock';
import DetailBlock from './DetailBlock';
import ActiveCertificateBlock from './ActiveCertificateBlock';
import AdminUserGroupsBlock from '@/features/groups/components/AdminUserGroupsBlock';
import { BackButton } from '@/components/BackButton';

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useUserDetails(id ?? '');

  if (isLoading) return <p className="text-sm text-blue-dark p-6">Загрузка…</p>;
  if (error || !data) return <p className="text-error p-6">Ошибка загрузки пользователя</p>;

  const activeGroup =
    data.groups.length > 0 ? data.groups.sort((a, b) => b.rank - a.rank)[0].name : null;

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden max-w-5xl mx-auto"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h1 className="text-2xl font-bold text-blue-dark">Детали пользователя</h1>
        <BackButton />
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        <UserBasicBlock
          userId={data.id}
          fullName={data.fullName}
          fullNameLatin={data.fullNameLatin}
          email={data.email}
          phone={data.phone}
          birthDate={data.birthDate}
          country={data.country}
          city={data.city}
          role={data.role}
          createdAt={data.createdAt}
          groupName={
            data.groups.length > 0 ? data.groups.sort((a, b) => b.rank - a.rank)[0].name : null
          }
        />

        <AdminUserGroupsBlock userId={data.id} />

        <ActiveCertificateBlock userId={data.id} certificates={data.certificates} />

        <AdminCEUMatrixBlock
          userId={data.id}
          isSupervisor={activeGroup === 'Супервизор' || activeGroup === 'Опытный Супервизор'}
        />

        <UserSupervisionMatrix
          userId={data.id}
          isSupervisor={activeGroup === 'Супервизор' || activeGroup === 'Опытный Супервизор'}
        />

        <PaymentsBlock payments={data.payments} userId={data.id} />

        <DetailBlock title="Загруженные файлы" items={data.uploadedFiles} userId={data.id} />
      </div>
    </div>
  );
}
