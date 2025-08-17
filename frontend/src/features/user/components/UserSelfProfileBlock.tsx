// src/features/user/components/UserSelfProfileBlock.tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUpdateMe } from '@/features/user/hooks/useUpdateMe';
import type { CurrentUser } from '@/features/auth/api/me';

const roleLabels = {
  STUDENT: 'Ученик',
  REVIEWER: 'Супервизор',
  ADMIN: 'Администратор',
} as const;

export function UserSelfProfileBlock({ user }: { user: CurrentUser }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName ?? '',
    phone: user.phone ?? '',
    birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
    country: user.country ?? '',
    city: user.city ?? '',
  });

  // если user обновился (после PATCH), синхронизируем форму
  useEffect(() => {
    setForm({
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      country: user.country ?? '',
      city: user.city ?? '',
    });
  }, [user.fullName, user.phone, user.birthDate, user.country, user.city]);

  const mutation = useUpdateMe();

  const onCancel = () => {
    setForm({
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      country: user.country ?? '',
      city: user.city ?? '',
    });
    setEdit(false);
  };

  const onSave = async () => {
    try {
      await mutation.mutateAsync({
        fullName: form.fullName || undefined,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined, // 'YYYY-MM-DD'
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      toast.success('Профиль обновлён');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="bg-white  space-y-4" style={{ borderColor: 'var(--color-green-light)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-dark">Профиль</h3>
      </div>

      {/* Body */}
      {!edit ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Meta label="Имя" value={user.fullName || '—'} />
          <Meta label="Email" value={user.email} />
          <Meta label="Телефон" value={user.phone || '—'} />
          <Meta label="Дата рождения" value={fmt(user.birthDate)} />
          <Meta label="Город" value={user.city || '—'} />
          <Meta label="Страна" value={user.country || '—'} />
          <Meta label="Роль" value={roleLabels[user.role] || user.role} />
          <Meta label="Группа" value={user.activeGroup?.name || '—'} />
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
              <div>{user.email}</div>
            </Field>
            <Field label="Роль">
              <div>{roleLabels[user.role] || user.role}</div>
            </Field>
            <Field label="Группа">
              <div>{user.activeGroup?.name || '—'}</div>
            </Field>
          </div>
        </div>
      )}

      {/* Bottom-left actions */}
      <div className="pt-2 flex gap-2 justify-start">
        {!edit ? (
          <button className="btn btn-accent" onClick={() => setEdit(true)}>
            Редактировать
          </button>
        ) : (
          <>
            <button className="btn btn-brand" onClick={onSave} disabled={mutation.isPending}>
              Сохранить
            </button>
            <button className="btn" onClick={onCancel} disabled={mutation.isPending}>
              Отмена
            </button>
          </>
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

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
