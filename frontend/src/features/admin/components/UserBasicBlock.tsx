import { useState } from 'react';
import { useUpdateUserInfo } from '@/features/admin/hooks/useUpdateUserInfo';
import { toast } from 'sonner';

type Props = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  country: string | null;
  city: string | null;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  createdAt: string;
  groupName: string | null;
};

export default function UserBasicBlock(props: Props) {
  const { userId, fullName, email, phone, birthDate, country, city, role, createdAt, groupName } =
    props;

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    fullName: fullName ?? '',
    phone: phone ?? '',
    birthDate: birthDate ? toDateInput(birthDate) : '',
    country: country ?? '',
    city: city ?? '',
    avatarUrl: '',
  });

  const mutation = useUpdateUserInfo(userId);

  function toDateInput(iso: string) {
    return iso.slice(0, 10);
  }

  function dateOnlyToISO(dateOnly: string) {
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

  const onSave = async () => {
    try {
      const birth = form.birthDate.trim() ? dateOnlyToISO(form.birthDate.trim()) : undefined;

      await mutation.mutateAsync({
        fullName: form.fullName || undefined,
        phone: form.phone.trim() || undefined,
        birthDate: birth,
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
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-blue-dark">Основная информация</h2>

      <div
        className="rounded-2xl border bg-white p-4 space-y-4 header-shadow"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div className="flex items-center justify-between">
          {!edit ? (
            <button className="btn btn-brand" onClick={() => setEdit(true)}>
              Редактировать
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-brand" onClick={onSave} disabled={mutation.isPending}>
                Сохранить
              </button>
              <button className="btn" onClick={onCancel} disabled={mutation.isPending}>
                Отмена
              </button>
            </div>
          )}
        </div>

        {!edit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Meta label="Имя" value={fullName || '—'} />
            <Meta label="Email" value={email} />
            <Meta label="Телефон" value={phone || '—'} />
            <Meta label="Дата рождения" value={fmt(birthDate)} />
            <Meta label="Город" value={city || '—'} />
            <Meta label="Страна" value={country || '—'} />
            <Meta
              label="Роль"
              value={
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    color: 'var(--color-white)',
                    background:
                      role === 'ADMIN' ? 'var(--color-green-brand)' : 'var(--color-blue-dark)',
                  }}
                >
                  {roleMap[role]}
                </span>
              }
            />
            <Meta label="Основная группа" value={groupName || '—'} />
            <Meta label="Зарегистрирован" value={fmt(createdAt)} />
          </div>
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

            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Email">
                <div>{email}</div>
              </Field>
              <Field label="Роль">
                <div>{roleMap[role]}</div>
              </Field>
              <Field label="Основная группа">
                <div>{groupName || '—'}</div>
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-blue-dark">{label}</label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-blue-dark">{label}:</div>
      <div>{value}</div>
    </div>
  );
}
