import { useParams } from 'react-router-dom';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import UserBasicBlock from './UserBasicBlock';
import CEUBlock from './CEUBlock';
import SupervisionBlock from './SupervisionBlock';
import PaymentsBlock from './PaymentsBlock';
import DocReviewBlock from './DocReviewBlock';
import DetailBlock from './DetailBlock';
import { BackButton } from '@/components/BackButton';

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useUserDetails(id || '');

  if (isLoading) return <p>Загрузка...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки пользователя</p>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark">Детали пользователя</h1>

      <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border">
        <UserBasicBlock
          fullName={data.fullName}
          email={data.email}
          phone={data.phone}
          birthDate={data.birthDate}
          country={data.country}
          city={data.city}
          role={data.role}
          createdAt={data.createdAt}
          groupName={
            data.groups.length > 0 ? data.groups.sort((a, b) => a.rank - b.rank)[0].name : null
          }
          isEmailConfirmed={data.isEmailConfirmed}
        />

        <CEUBlock ceuRecords={data.ceuRecords} userId={data.id} />
        <SupervisionBlock supervisionRecords={data.supervisionRecords} userId={data.id} />
        <PaymentsBlock payments={data.payments} userId={data.id} />
        <DocReviewBlock requests={data.documentReviewRequests} />
        <DetailBlock title="Загруженные файлы" items={data.uploadedFiles} userId={data.id} />
      </div>

      <BackButton />
    </div>
  );
}
