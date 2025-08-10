type Props = {
  fullName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  country: string | null;
  city: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  createdAt: string;
  isEmailConfirmed: boolean;
  groupName: string | null;
};

export default function UserBasicBlock(props: Props) {
  const {
    fullName,
    email,
    phone,
    birthDate,
    country,
    city,
    role,
    createdAt,
    isEmailConfirmed,
    groupName,
  } = props;

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  const roleMap = {
    ADMIN: 'Администратор',
    REVIEWER: 'Проверяющий',
    STUDENT: 'Студент',
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">Основная информация</h2>

      <p>
        <strong>Имя:</strong> {fullName}
      </p>
      <p>
        <strong>Email:</strong> {email}
      </p>
      <p>
        <strong>Подтвержден:</strong> {isEmailConfirmed ? 'Да' : 'Нет'}
      </p>
      <p>
        <strong>Телефон:</strong> {phone || '—'}
      </p>
      <p>
        <strong>Дата рождения:</strong> {formatDate(birthDate)}
      </p>
      <p>
        <strong>Город:</strong> {city || '—'}
      </p>
      <p>
        <strong>Страна:</strong> {country || '—'}
      </p>
      <p>
        <strong>Роль:</strong> {roleMap[role]}
      </p>
      <p>
        <strong>Основная группа:</strong> {groupName || '—'}
      </p>
      <p>
        <strong>Зарегистрирован:</strong> {formatDate(createdAt)}
      </p>
    </div>
  );
}
