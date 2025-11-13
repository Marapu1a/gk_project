// src/features/admin/components/UserBasicBlock.tsx
import { useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUpdateUserInfo } from '@/features/admin/hooks/useUpdateUserInfo';
import { useToggleUserRole } from '@/features/admin/hooks/useToggleUserRole';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { Country, City } from 'country-state-city';
import PhoneInput from 'react-phone-input-2';
import { isValidPhoneNumber } from 'libphonenumber-js';

type Props = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  country: string | null; // CSV
  city: string | null; // CSV
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  createdAt: string;
  groupName: string | null;
};

const roleMap = { ADMIN: 'Администратор', REVIEWER: 'Проверяющий', STUDENT: 'Студент' } as const;

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

type Option = { value: string; label: string; meta?: any };

export default function UserBasicBlock(props: Props) {
  const { userId, fullName, email, phone, birthDate, country, city, role, createdAt, groupName } =
    props;

  const names = splitFullName(fullName);
  const [edit, setEdit] = useState(false);

  // ===== страны (латиницей)
  const allCountries: Option[] = useMemo(
    () =>
      Country.getAllCountries()
        .map((c) => ({ value: c.isoCode, label: c.name, meta: c }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );
  const countryByName = useMemo(
    () => new Map(allCountries.map((o) => [o.label.toLowerCase(), o])),
    [allCountries],
  );
  const countryByIso = useMemo(
    () => new Map(allCountries.map((o) => [o.value.toUpperCase(), o])),
    [allCountries],
  );
  const initialCountries = useMemo(() => {
    const names = strToArr(country);
    return names
      .map((n) => countryByName.get(n.toLowerCase()) || countryByIso.get(n.toUpperCase()))
      .filter(Boolean) as Option[];
  }, [country, countryByName, countryByIso]);

  // кэши городов
  const cityCacheRef = useRef<Map<string, Option[]>>(new Map()); // по ISO2
  const mergedCacheRef = useRef<Map<string, Option[]>>(new Map()); // по множеству стран

  // ===== форма
  const [form, setForm] = useState({
    lastName: names.lastName,
    firstName: names.firstName,
    middleName: names.middleName,
    phone: phone ?? '',
    birthDate: birthDate ? toDateInput(birthDate) : '',
    countries: initialCountries as Option[],
    cities: strToArr(city), // string[] (latin)
    avatarUrl: '',
  });

  // sync при приходе новых пропсов (переключение юзера без размонтирования)
  useEffect(() => {
    const n = splitFullName(fullName);
    const cntrs = strToArr(country)
      .map((x) => countryByName.get(x.toLowerCase()) || countryByIso.get(x.toUpperCase()))
      .filter(Boolean) as Option[];
    setForm({
      lastName: n.lastName,
      firstName: n.firstName,
      middleName: n.middleName,
      phone: phone ?? '',
      birthDate: birthDate ? toDateInput(birthDate) : '',
      countries: cntrs,
      cities: strToArr(city),
      avatarUrl: '',
    });
  }, [fullName, phone, birthDate, country, city, countryByName, countryByIso]);

  // подчистка городов при смене стран (если кэш уже есть)
  useEffect(() => {
    const cache = cityCacheRef.current;
    const isos = form.countries.map((c) => c.value);
    const allowed = new Set<string>();
    for (const iso of isos) {
      const list = cache.get(iso);
      if (list) for (const o of list) allowed.add(o.label.toLowerCase());
    }
    if (!isos.length) {
      setForm((f) => ({ ...f, cities: [] }));
      return;
    }
    if (allowed.size > 0) {
      setForm((f) => ({ ...f, cities: f.cities.filter((x) => allowed.has(x.toLowerCase())) }));
    }
  }, [form.countries]);

  const mutation = useUpdateUserInfo(userId);
  const toggleRole = useToggleUserRole();

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
    const n = splitFullName(fullName);
    const cntrs = strToArr(country)
      .map((x) => countryByName.get(x.toLowerCase()) || countryByIso.get(x.toUpperCase()))
      .filter(Boolean) as Option[];
    setForm({
      lastName: n.lastName,
      firstName: n.firstName,
      middleName: n.middleName,
      phone: phone ?? '',
      birthDate: birthDate ? toDateInput(birthDate) : '',
      countries: cntrs,
      cities: strToArr(city),
      avatarUrl: '',
    });
    setEdit(false);
  };

  const onSave = async () => {
    const ln = titleCaseRu(form.lastName);
    const fn = titleCaseRu(form.firstName);
    const mn = form.middleName ? titleCaseRu(form.middleName) : '';
    const fullNameOut = [ln, fn, mn].filter(Boolean).join(' ');

    const birth = form.birthDate.trim() ? dateOnlyToISO(form.birthDate.trim()) : undefined;
    const countriesStr = arrToStr(form.countries.map((o) => o.label));
    const citiesStr = arrToStr(form.cities);

    const phoneIntl = normalizePhone(form.phone);
    if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
      toast.error('Неверный номер телефона');
      return;
    }

    try {
      await mutation.mutateAsync({
        fullName: fullNameOut || undefined,
        phone: phoneIntl || undefined,
        birthDate: birth,
        country: countriesStr || undefined, // CSV, латиница
        city: citiesStr || undefined, // CSV, латиница
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
      toast.success('Обновлено');
      setEdit(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить');
    }
  };

  // debounce для callback-API
  function debounceCb<F extends (...a: any[]) => void>(fn: F, ms = 200) {
    let t: any;
    return (...args: Parameters<F>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const buildPoolForCountries = (isos: string[]): Option[] => {
    const cityCache = cityCacheRef.current;
    const key = isos.slice().sort().join(',');
    const mergedCache = mergedCacheRef.current;

    if (mergedCache.has(key)) return mergedCache.get(key)!;

    let pool: Option[] = [];
    for (const iso of isos) {
      if (!cityCache.has(iso)) {
        const raw = City.getCitiesOfCountry(iso) || [];
        cityCache.set(
          iso,
          raw.map((ct) => ({ value: `${ct.name}|||${iso}`, label: ct.name, meta: ct })),
        );
      }
      pool = pool.concat(cityCache.get(iso)!);
    }
    mergedCache.set(key, pool);
    return pool;
  };

  // loadOptions для AsyncSelect (callback форма, с дебаунсом)
  const loadCityOptions = useMemo(() => {
    return debounceCb((inputValue: string, callback: (opts: Option[]) => void) => {
      const q = (inputValue || '').trim().toLowerCase();
      const isos = form.countries.map((c) => c.value);

      if (q.length < 2 || isos.length === 0) {
        callback([]);
        return;
      }

      const pool = buildPoolForCountries(isos);
      const res = pool.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
      callback(res);
    }, 200);
  }, [form.countries]);

  const currentCityOptions: Option[] = useMemo(() => {
    const cache = cityCacheRef.current;
    const isos = form.countries.map((c) => c.value);
    const res: Option[] = [];
    for (const name of form.cities) {
      let found: Option | null = null;
      for (const iso of isos) {
        const list = cache.get(iso) || [];
        const hit = list.find((o) => o.label.toLowerCase() === name.toLowerCase());
        if (hit) {
          found = hit;
          break;
        }
      }
      res.push(found ?? { value: name, label: name });
    }
    return res;
  }, [form.cities, form.countries]);

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
              <button className="btn btn-brand" onClick={() => setEdit(true)}>
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
              <PhoneInput
                country="ru"
                enableSearch
                containerClass="!w-full"
                inputClass="input !pl-12"
                buttonClass="!border-none"
                specialLabel=""
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                isValid={(value: string) => isValidPhoneNumber(normalizePhone(value))}
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

            {/* Страны (латиницей) */}
            <Field label="Страны (ввод латиницей)">
              <Select
                isMulti
                options={allCountries}
                value={form.countries}
                onChange={(opts) => setForm({ ...form, countries: (opts as Option[]) ?? [] })}
                classNamePrefix="select"
                placeholder="Начните вводить страну…"
                isClearable
              />
            </Field>

            {/* Города (латиницей, по выбранным странам) */}
            <Field label="Города (ввод латиницей)">
              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions={[]}
                loadOptions={loadCityOptions}
                value={currentCityOptions}
                onChange={(opts) => {
                  const names = ((opts as Option[]) ?? []).map((o) => o.label);
                  setForm({ ...form, cities: names });
                }}
                classNamePrefix="select"
                placeholder={
                  form.countries.length ? 'Начните вводить город…' : 'Сначала выберите страну'
                }
                isDisabled={!form.countries.length}
                isClearable
                noOptionsMessage={() => 'Ничего не найдено'}
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
