import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUpdateMe } from '@/features/user/hooks/useUpdateMe';
import type { CurrentUser } from '@/features/auth/api/me';
import PhoneInput from 'react-phone-input-2';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { UserLocationFields } from './UserLocationFields';

const roleLabels = {
  STUDENT: 'Студент',
  REVIEWER: 'Супервизор',
  ADMIN: 'Администратор',
} as const;

// --- helpers ---
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function titleCaseAny(s: string) {
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
function splitFullName(fullName?: string | null) {
  const parts = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const [lastName = '', firstName = '', ...rest] = parts;
  const middleName = rest.length ? rest.join(' ') : '';
  return { lastName, firstName, middleName };
}
const strToArr = (s?: string | null) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const arrToStr = (arr: string[]) =>
  arr
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ');

const normalizePhone = (raw: string) => {
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits ? (digits.startsWith('+') ? digits : `+${digits}`) : '';
};

export function UserSelfProfileBlock({ user }: { user: CurrentUser }) {
  const [edit, setEdit] = useState(false);

  const initialNamesRu = splitFullName(user.fullName);
  const initialNamesLat = splitFullName((user as any).fullNameLatin);

  const [form, setForm] = useState({
    lastName: initialNamesRu.lastName,
    firstName: initialNamesRu.firstName,
    middleName: initialNamesRu.middleName,

    lastNameLatin: initialNamesLat.lastName,
    firstNameLatin: initialNamesLat.firstName,

    phone: user.phone ?? '',
    birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
    countries: strToArr(user.country),
    cities: strToArr(user.city),
  });

  useEffect(() => {
    const namesRu = splitFullName(user.fullName);
    const namesLat = splitFullName((user as any).fullNameLatin);

    setForm({
      lastName: namesRu.lastName,
      firstName: namesRu.firstName,
      middleName: namesRu.middleName,
      lastNameLatin: namesLat.lastName,
      firstNameLatin: namesLat.firstName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      countries: strToArr(user.country),
      cities: strToArr(user.city),
    });
  }, [
    user.fullName,
    (user as any).fullNameLatin,
    user.phone,
    user.birthDate,
    user.country,
    user.city,
  ]);

  const mutation = useUpdateMe();

  const onCancel = () => {
    const namesRu = splitFullName(user.fullName);
    const namesLat = splitFullName((user as any).fullNameLatin);

    setForm({
      lastName: namesRu.lastName,
      firstName: namesRu.firstName,
      middleName: namesRu.middleName,
      lastNameLatin: namesLat.lastName,
      firstNameLatin: namesLat.firstName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      countries: strToArr(user.country),
      cities: strToArr(user.city),
    });

    setEdit(false);
  };

  const onSave = async () => {
    const ln = titleCaseAny(form.lastName);
    const fn = titleCaseAny(form.firstName);
    const mn = form.middleName ? titleCaseAny(form.middleName) : '';

    if (!ln || !fn) {
      toast.error('Имя и фамилия обязательны');
      return;
    }

    const fullName = [ln, fn, mn].filter(Boolean).join(' ');

    const lnLat = titleCaseAny(form.lastNameLatin);
    const fnLat = titleCaseAny(form.firstNameLatin);
    const fullNameLatin = [lnLat, fnLat].filter(Boolean).join(' ');

    const phoneIntl = normalizePhone(form.phone);
    if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
      toast.error('Неверный номер телефона');
      return;
    }

    const countriesStr = arrToStr(form.countries);
    const citiesStr = arrToStr(form.cities);

    try {
      await mutation.mutateAsync({
        fullName: fullName || undefined,
        fullNameLatin: fullNameLatin || undefined,
        phone: phoneIntl || undefined,
        birthDate: form.birthDate || undefined,
        country: countriesStr || undefined,
        city: citiesStr || undefined,
      });
      toast.success('Профиль обновлён');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="bg-white space-y-4" style={{ borderColor: 'var(--color-green-light)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-dark">Профиль</h3>
      </div>

      {!edit ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Meta label="Имя" value={user.fullName || '—'} />
          <Meta label="Имя (латиницей)" value={(user as any).fullNameLatin || '—'} />
          <Meta label="Email" value={user.email} />
          <Meta label="Телефон" value={user.phone || '—'} />
          <Meta label="Дата рождения" value={fmt(user.birthDate)} />
          <Meta label="Город" value={arrToStr(strToArr(user.city)) || '—'} />
          <Meta label="Страна" value={arrToStr(strToArr(user.country)) || '—'} />
          <Meta label="Роль" value={roleLabels[user.role] || user.role} />
          <Meta label="Группа" value={user.activeGroup?.name || '—'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Фамилия (рус.)">
            <input
              className="input w-full"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>

          <Field label="Имя (рус.)">
            <input
              className="input w-full"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>

          <Field label="Отчество (если есть)">
            <input
              className="input w-full"
              value={form.middleName}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
            />
          </Field>

          {/* разделитель */}
          <div className="col-span-full text-xs text-gray-500 text-center mt-2">
            ФИО латиницей — как в загранпаспорте
          </div>

          <Field label="Фамилия (лат.)">
            <input
              className="input w-full"
              value={form.lastNameLatin}
              onChange={(e) => setForm({ ...form, lastNameLatin: e.target.value })}
            />
          </Field>

          <Field label="Имя (лат.)">
            <input
              className="input w-full"
              value={form.firstNameLatin}
              onChange={(e) => setForm({ ...form, firstNameLatin: e.target.value })}
            />
          </Field>

          <Field label="Телефон">
            <PhoneInput
              country="ru"
              enableSearch
              containerClass="w-full"
              inputClass="input"
              buttonClass="!border-none"
              specialLabel=""
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
              isValid={(value: string) => {
                const n = normalizePhone(value);
                return !n || isValidPhoneNumber(n);
              }}
              inputProps={{ name: 'tel', autoComplete: 'tel' }}
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

          <UserLocationFields
            countries={form.countries}
            cities={form.cities}
            onChange={({ countries, cities }) =>
              setForm((prev) => ({ ...prev, countries, cities }))
            }
          />

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
