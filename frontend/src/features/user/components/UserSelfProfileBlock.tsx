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

// --- helpers ---
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

// "Иван-иванов" -> "Иван-Иванов", учитываем дефисы и пробелы
function titleCaseRu(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((token) =>
      token
        .split('-')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');
}

/** Пытаемся распарсить сохранённое fullName → {last, first, middle?} */
function splitFullName(fullName?: string) {
  const parts = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const [lastName = '', firstName = '', ...rest] = parts;
  const middleName = rest.length ? rest.join(' ') : '';
  return { lastName, firstName, middleName };
}

export function UserSelfProfileBlock({ user }: { user: CurrentUser }) {
  const [edit, setEdit] = useState(false);

  const initialNames = splitFullName(user.fullName);

  const [form, setForm] = useState({
    lastName: initialNames.lastName,
    firstName: initialNames.firstName,
    middleName: initialNames.middleName,
    phone: user.phone ?? '',
    birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
    country: user.country ?? '',
    city: user.city ?? '',
  });

  // синхронизируем форму при обновлении user
  useEffect(() => {
    const names = splitFullName(user.fullName);
    setForm({
      lastName: names.lastName,
      firstName: names.firstName,
      middleName: names.middleName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      country: user.country ?? '',
      city: user.city ?? '',
    });
  }, [user.fullName, user.phone, user.birthDate, user.country, user.city]);

  const mutation = useUpdateMe();

  const onCancel = () => {
    const names = splitFullName(user.fullName);
    setForm({
      lastName: names.lastName,
      firstName: names.firstName,
      middleName: names.middleName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      country: user.country ?? '',
      city: user.city ?? '',
    });
    setEdit(false);
  };

  const onSave = async () => {
    const ln = titleCaseRu(form.lastName);
    const fn = titleCaseRu(form.firstName);
    const mn = form.middleName ? titleCaseRu(form.middleName) : '';
    const fullName = [ln, fn, mn].filter(Boolean).join(' ');

    try {
      await mutation.mutateAsync({
        fullName: fullName || undefined, // <- бэку по-прежнему отдаем fullName
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-dark">Профиль</h3>
      </div>

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
          {/* ФИО разбито на 3 поля */}
          <Field label="Фамилия">
            <input
              className="input w-full"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Имя">
            <input
              className="input w-full"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Отчество (если есть)">
            <input
              className="input w-full"
              autoComplete="additional-name"
              value={form.middleName}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
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
