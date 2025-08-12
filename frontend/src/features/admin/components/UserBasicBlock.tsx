import { useState } from 'react';
import { useUpdateUserInfo } from '@/features/admin/hooks/useUpdateUserInfo';
import { Button } from '@/components/Button';
import { toast } from 'sonner';

type Props = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  birthDate: string | null; // ISO
  country: string | null;
  city: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  createdAt: string; // ISO
  isEmailConfirmed: boolean;
  groupName: string | null;
};

export default function UserBasicBlock(props: Props) {
  const {
    userId,
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

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    fullName: fullName ?? '',
    phone: phone ?? '',
    birthDate: birthDate ? toDateInput(birthDate) : '', // yyyy-mm-dd
    country: country ?? '',
    city: city ?? '',
    avatarUrl: '',
  });

  const mutation = useUpdateUserInfo(userId);

  // 1) заменяем toDateInput и добавляем конвертер
  function toDateInput(iso: string) {
    // без TZ-сдвигов
    return iso.slice(0, 10);
  }

  function dateOnlyToISO(dateOnly: string) {
    // "yyyy-mm-dd" -> ISO "yyyy-mm-ddT00:00:00.000Z"
    const [y, m, d] = dateOnly.split('-').map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toISOString();
  }

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
  const roleMap = { ADMIN: 'Администратор', REVIEWER: 'Проверяющий', STUDENT: 'Студент' } as const;

  const onCancel = () => {
    setForm({
      fullName: fullName ?? '',
      phone: phone ?? '',
      birthDate: birthDate ? toDateInput(birthDate) : '',
      country: country ?? '',
      city: city ?? '',
      avatarUrl: '',
    });
    setEdit(false);
  };

  // 2) onSave: отправляем валидный ISO
  const onSave = async () => {
    try {
      const birth = form.birthDate.trim() ? dateOnlyToISO(form.birthDate.trim()) : undefined;

      await mutation.mutateAsync({
        fullName: form.fullName || undefined,
        phone: form.phone.trim() || undefined,
        birthDate: birth, // <-- ISO
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
      toast.success('Обновлено');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-green-brand">Основная информация</h2>
        {!edit ? (
          <button className="btn btn-brand" onClick={() => setEdit(true)}>
            Редактировать
          </button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={onSave} loading={mutation.isPending}>
              Сохранить
            </Button>
            <button className="btn" onClick={onCancel} disabled={mutation.isPending}>
              Отмена
            </button>
          </div>
        )}
      </div>

      {!edit ? (
        <>
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
            <strong>Дата рождения:</strong> {fmt(birthDate)}
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
            <strong>Зарегистрирован:</strong> {fmt(createdAt)}
          </p>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Имя">
            <input
              className="input w-full"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Телефон">
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Дата рождения">
            <input
              type="date"
              className="input w-full"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Field>
          <Field label="Страна">
            <input
              className="input w-full"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </Field>
          <Field label="Город">
            <input
              className="input w-full"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>

          {/* Read-only */}
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email">
              <div className="text-gray-700">{email}</div>
            </Field>

            <Field label="Роль">
              <div className="text-gray-700">{roleMap[role]}</div>
            </Field>

            <Field label="Основная группа">
              <div className="text-gray-700">{groupName || '—'}</div>
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}
