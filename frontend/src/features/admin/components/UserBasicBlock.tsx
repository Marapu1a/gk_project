import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { AvatarDisplay } from '@/features/files/components/AvatarDisplay';
import {
  AVATAR_UPLOAD_HINT,
  AvatarUploadModal,
} from '@/features/files/components/AvatarUploadModal';
import { useUpdateUserInfo } from '@/features/admin/hooks/useUpdateUserInfo';
import { UserLocationFields } from '@/features/user/components/UserLocationFields';

type Props = {
  userId: string;
  registrationNumber?: string | null;
  fullName: string;
  fullNameLatin: string | null;
  email: string;
  phone: string | null;
  birthDate: string | null;
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
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

const normalizePhone = (raw: string) => {
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits ? (digits.startsWith('+') ? digits : `+${digits}`) : '';
};

export default function UserBasicBlock(props: Props) {
  const {
    userId,
    registrationNumber,
    fullName,
    fullNameLatin,
    email,
    phone,
    birthDate,
    country,
    city,
    avatarUrl,
    role,
    createdAt,
    groupName,
  } = props;

  const namesRu = splitFullName(fullName);
  const namesLat = splitFullName(fullNameLatin);
  const mutation = useUpdateUserInfo(userId);

  const [edit, setEdit] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [displayFullName, setDisplayFullName] = useState<string>(fullName);
  const [displayFullNameLatin, setDisplayFullNameLatin] = useState<string | null>(
    fullNameLatin ?? null,
  );
  const [form, setForm] = useState({
    lastName: namesRu.lastName,
    firstName: namesRu.firstName,
    middleName: namesRu.middleName,
    lastNameLatin: namesLat.lastName,
    firstNameLatin: namesLat.firstName,
    phone: phone ?? '',
    birthDate: birthDate ? toDateInput(birthDate) : '',
    countries: strToArr(country),
    cities: strToArr(city),
  });

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
    });

    setDisplayFullName(fullName);
    setDisplayFullNameLatin(fullNameLatin ?? null);
  }, [fullName, fullNameLatin, phone, birthDate, country, city]);

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
    });
    setEdit(false);
  };

  const onSave = async () => {
    const ln = titleCaseRu(form.lastName);
    const fn = titleCaseRu(form.firstName);
    const mn = form.middleName ? titleCaseRu(form.middleName) : '';
    const fullNameOut = [ln, fn, mn].filter(Boolean).join(' ');

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
      });

      setDisplayFullName(fullNameOut || '');
      setDisplayFullNameLatin(fullNameLatinOut || null);
      toast.success('Данные пользователя обновлены');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dashboard-v2-title">Основная информация</h2>
        {!edit ? (
          <button
            className="btn dashboard-v2-action dashboard-v2-action-primary"
            onClick={() => setEdit(true)}
          >
            Редактировать
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn dashboard-v2-action dashboard-v2-action-primary"
              onClick={onSave}
              disabled={mutation.isPending}
            >
              Сохранить
            </button>
            <button
              className="btn dashboard-v2-action dashboard-v2-action-secondary"
              onClick={onCancel}
              disabled={mutation.isPending}
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[168px_minmax(0,1fr)]">
        <div className="flex items-center justify-center rounded-[16px] bg-[var(--color-blue-soft)] p-4">
          <AvatarDisplay
            src={avatarUrl}
            alt={displayFullName || email}
            w="w-[132px]"
            h="h-[132px]"
            editable
            onClick={() => setIsAvatarOpen(true)}
          />
        </div>

        {!edit ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-[16px] bg-white p-4 text-[15px] md:grid-cols-2">
            <Meta label="ФИО" value={displayFullName || '—'} />
            <Meta label="ФИО латиницей" value={displayFullNameLatin || '—'} />
            <Meta label="Email" value={email} />
            <Meta label="N ЦСПАП" value={registrationNumber || '—'} />
            <Meta label="Телефон" value={phone || '—'} />
            <Meta label="Дата рождения" value={fmt(birthDate)} />
            <Meta label="Город" value={city || '—'} />
            <Meta label="Страна" value={country || '—'} />
            <Meta label="Роль" value={roleMap[role]} />
            <Meta label="Основная группа" value={groupName || '—'} />
            <Meta label="Зарегистрирован" value={fmt(createdAt)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 rounded-[16px] bg-white p-4 md:grid-cols-2">
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
            <Field label="Отчество">
              <input
                className="input w-full"
                autoComplete="additional-name"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              />
            </Field>
            <div className="hidden md:block" />

            <Field label="Фамилия ENG">
              <input
                className="input w-full"
                value={form.lastNameLatin}
                onChange={(e) => setForm({ ...form, lastNameLatin: e.target.value })}
              />
            </Field>
            <Field label="Имя ENG">
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
          </div>
        )}
      </div>

      {isAvatarOpen ? (
        <AvatarUploadModal
          userId={userId}
          onClose={() => setIsAvatarOpen(false)}
          currentAvatarUrl={avatarUrl}
          hint={AVATAR_UPLOAD_HINT}
          targetUserId={userId}
        />
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="dashboard-v2-label mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="dashboard-v2-caption min-w-[128px]">{label}:</div>
      <div className="dashboard-v2-text font-semibold">{value}</div>
    </div>
  );
}
