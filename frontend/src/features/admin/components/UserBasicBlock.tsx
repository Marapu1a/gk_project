// src/features/admin/components/UserBasicBlock.tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUpdateUserInfo } from '@/features/admin/hooks/useUpdateUserInfo';
import { useToggleUserRole } from '@/features/admin/hooks/useToggleUserRole';
import { UserLocationFields } from '@/features/user/components/UserLocationFields';
import { UpdateUserPasswordModal } from './UpdateUserPasswordModal';
import PhoneInput from 'react-phone-input-2';
import { isValidPhoneNumber } from 'libphonenumber-js';

type Props = {
  userId: string;
  fullName: string;
  fullNameLatin: string | null;
  email: string;
  phone: string | null;
  birthDate: string | null;
  country: string | null; // CSV
  city: string | null; // CSV
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  createdAt: string;
  groupName: string | null;
};

const roleMap = { ADMIN: 'Администратор', REVIEWER: 'Проверяющий', STUDENT: 'Соискатель' } as const;

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function dateOnlyToISO(dateOnly: string) {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toISOString();
}
function titleCaseRu(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) =>
      tok
        .split('-')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');
}
function titleCaseEn(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) =>
      tok
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

// нормализуем к международному формату
const normalizePhone = (raw: string) => {
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits ? (digits.startsWith('+') ? digits : `+${digits}`) : '';
};

export default function UserBasicBlock(props: Props) {
  const {
    userId,
    fullName,
    fullNameLatin,
    email,
    phone,
    birthDate,
    country,
    city,
    role,
    createdAt,
    groupName,
  } = props;

  const namesRu = splitFullName(fullName);
  const namesLat = splitFullName(fullNameLatin);

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [edit, setEdit] = useState(false);

  // локальное отображаемое ФИО (чтобы сразу видеть результат после сохранения)
  const [displayFullName, setDisplayFullName] = useState<string>(fullName);
  const [displayFullNameLatin, setDisplayFullNameLatin] = useState<string | null>(
    fullNameLatin ?? null,
  );

  // форма
  const [form, setForm] = useState({
    // русское ФИО
    lastName: namesRu.lastName,
    firstName: namesRu.firstName,
    middleName: namesRu.middleName,
    // латиница (как в загранпаспорте: фамилия + имя)
    lastNameLatin: namesLat.lastName,
    firstNameLatin: namesLat.firstName,
    // остальное
    phone: phone ?? '',
    birthDate: birthDate ? toDateInput(birthDate) : '',
    countries: strToArr(country), // string[]
    cities: strToArr(city), // string[]
    avatarUrl: '',
  });

  const mutation = useUpdateUserInfo(userId);
  const toggleRole = useToggleUserRole();

  // синхронизация, если сверху приехали новые данные (переключение юзера без размонтирования)
  useEffect(() => {
    const nRu = splitFullName(fullName);
    const nLat = splitFullName(fullNameLatin);

    setForm({
      lastName: nRu.lastName,
      firstName: nRu.firstName,
      middleName: nRu.middleName,
      lastNameLatin: nLat.lastName,
      firstNameLatin: nLat.firstName,
      phone: phone ?? '',
      birthDate: birthDate ? toDateInput(birthDate) : '',
      countries: strToArr(country),
      cities: strToArr(city),
      avatarUrl: '',
    });

    setDisplayFullName(fullName);
    setDisplayFullNameLatin(fullNameLatin ?? null);
  }, [fullName, fullNameLatin, phone, birthDate, country, city]);

  const onToggleRole = async () => {
    const toAdmin = role !== 'ADMIN';
    if (
      !confirm(toAdmin ? `Сделать ${email} администратором?` : `Снять администратора с ${email}?`)
    )
      return;
    try {
      await toggleRole.mutateAsync(userId);
      toast.success(toAdmin ? 'Права администратора выданы' : 'Права администратора сняты');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обновить роль');
    }
  };

  const onCancel = () => {
    const nRu = splitFullName(fullName);
    const nLat = splitFullName(fullNameLatin);

    setForm({
      lastName: nRu.lastName,
      firstName: nRu.firstName,
      middleName: nRu.middleName,
      lastNameLatin: nLat.lastName,
      firstNameLatin: nLat.firstName,
      phone: phone ?? '',
      birthDate: birthDate ? toDateInput(birthDate) : '',
      countries: strToArr(country),
      cities: strToArr(city),
      avatarUrl: '',
    });
    setEdit(false);
  };

  const onSave = async () => {
    // русское ФИО
    const ln = titleCaseRu(form.lastName);
    const fn = titleCaseRu(form.firstName);
    const mn = form.middleName ? titleCaseRu(form.middleName) : '';
    const fullNameOut = [ln, fn, mn].filter(Boolean).join(' ');

    // латиница: только фамилия + имя
    const lnLat = titleCaseEn(form.lastNameLatin);
    const fnLat = titleCaseEn(form.firstNameLatin);
    const fullNameLatinOut = [lnLat, fnLat].filter(Boolean).join(' ');

    const birth = form.birthDate.trim() ? dateOnlyToISO(form.birthDate.trim()) : undefined;
    const countriesStr = arrToStr(form.countries);
    const citiesStr = arrToStr(form.cities);

    const phoneIntl = normalizePhone(form.phone);
    if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
      toast.error('Неверный номер телефона');
      return;
    }

    try {
      await mutation.mutateAsync({
        fullName: fullNameOut || undefined,
        fullNameLatin: fullNameLatinOut || undefined,
        phone: phoneIntl || undefined,
        birthDate: birth,
        country: countriesStr || undefined,
        city: citiesStr || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });

      setDisplayFullName(fullNameOut || '');
      setDisplayFullNameLatin(fullNameLatinOut || null);

      toast.success('Обновлено');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-blue-dark">Основная информация</h2>

      <div
        className="rounded-2xl border bg-white p-4 space-y-4 header-shadow"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        {/* Верхняя панель действий */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!edit ? (
              <>
                <button className="btn btn-brand" onClick={() => setEdit(true)}>
                  Редактировать
                </button>
                <button className="btn btn-ghost" onClick={() => setIsPasswordOpen(true)}>
                  Сменить пароль
                </button>
                {isPasswordOpen && (
                  <UpdateUserPasswordModal
                    userId={userId}
                    onClose={() => setIsPasswordOpen(false)}
                  />
                )}
              </>
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

          <button
            onClick={onToggleRole}
            className={role === 'ADMIN' ? 'btn btn-danger' : 'btn btn-accent'}
          >
            {role === 'ADMIN' ? 'Снять администратора' : 'Сделать админом'}
          </button>
        </div>

        {/* Основной контент */}
        {!edit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Meta label="Имя" value={displayFullName || '—'} />
            <Meta label="Имя (латиницей)" value={displayFullNameLatin || '—'} />
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
            {/* ФИО (рус.) */}
            <Field label="Фамилия (рус.)">
              <input
                className="input w-full"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </Field>
            <Field label="Имя (рус.)">
              <input
                className="input w-full"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </Field>
            <Field label="Отчество (рус., если есть)">
              <input
                className="input w-full"
                autoComplete="additional-name"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              />
            </Field>

            {/* разделитель */}
            <div className="col-span-full text-xs text-gray-500 text-center mt-2">
              ФИО латиницей — как в загранпаспорте
            </div>

            {/* ФИО (лат.) */}
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

            {/* Страны + города (общий компонент) */}
            <UserLocationFields
              countries={form.countries}
              cities={form.cities}
              onChange={({ countries, cities }) =>
                setForm((prev) => ({ ...prev, countries, cities }))
              }
            />

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
