import { DetailBlock } from './DetailBlock';
import { useUserDetails } from '../hooks/useUserDetails';
import { BackButton } from '@/components/BackButton';

type Props = {
  userId: string;
};

export function UserDetails({ userId }: Props) {
  const { data, isLoading, error } = useUserDetails(userId);

  console.log(data);

  if (isLoading) return <p>Загрузка данных пользователя...</p>;
  if (error) return <p className="text-error">Ошибка загрузки данных</p>;
  if (!data) return <p className="text-error">Пользователь не найден</p>;

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Детали пользователя</h1>

      <div className="border rounded-xl shadow-sm p-6 space-y-6 bg-white">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-green-brand">Основная информация</h2>
          <p>
            <strong>Имя:</strong> {data.fullName}
          </p>
          <p>
            <strong>Email:</strong> {data.email}
          </p>
          <p>
            <strong>Роль:</strong> {data.role}
          </p>
          <p>
            <strong>Группы:</strong> {data.groups.map((g) => g.name).join(', ') || '—'}
          </p>
          <p>
            <strong>Создан:</strong> {formatDate(data.createdAt)}
          </p>
        </div>

        <DetailBlock
          title="CEU-заявки"
          items={data.ceuRecords.map((r) => ({
            id: r.id,
            name: `${r.eventName} (${formatDate(r.eventDate)})`,
          }))}
        />

        <DetailBlock
          title="Часы супервизии"
          items={data.supervisionRecords.map((r) => ({
            id: r.id,
            name: formatDate(r.createdAt),
          }))}
        />

        <DetailBlock
          title="Сертификаты"
          items={data.certificates.map((c) => ({
            id: c.id,
            name: `${c.title} (#${c.number})`,
          }))}
        />

        <DetailBlock
          title="Загруженные файлы"
          items={data.uploadedFiles.map((f) => ({
            id: f.id,
            name: f.name,
            fileId: f.fileId,
          }))}
        />
      </div>

      <BackButton />
    </div>
  );
}
