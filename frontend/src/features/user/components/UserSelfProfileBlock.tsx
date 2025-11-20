import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useUpdateMe } from '@/features/user/hooks/useUpdateMe';
import type { CurrentUser } from '@/features/auth/api/me';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { Country, City } from 'country-state-city';
import PhoneInput from 'react-phone-input-2';
import { isValidPhoneNumber } from 'libphonenumber-js';

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

type Option = { value: string; label: string; meta?: any };

export function UserSelfProfileBlock({ user }: { user: CurrentUser }) {
  const [edit, setEdit] = useState(false);

  const initialNamesRu = splitFullName(user.fullName);
  const initialNamesLat = splitFullName((user as any).fullNameLatin); // поле есть в API

  // Countries (латиницей, из country-state-city)
  const allCountries: Option[] = useMemo(
    () =>
      Country.getAllCountries()
        .map((c) => ({
          value: c.isoCode, // ISO2
          label: c.name, // English
          meta: c,
        }))
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
    const names = strToArr(user.country);
    return names
      .map((n) => countryByName.get(n.toLowerCase()) || countryByIso.get(n.toUpperCase()))
      .filter(Boolean) as Option[];
  }, [user.country, countryByName, countryByIso]);

  const cityCacheRef = useRef<Map<string, Option[]>>(new Map());

  const [form, setForm] = useState({
    // русское ФИО
    lastName: initialNamesRu.lastName,
    firstName: initialNamesRu.firstName,
    middleName: initialNamesRu.middleName,
    // латиница
    lastNameLatin: initialNamesLat.lastName,
    firstNameLatin: initialNamesLat.firstName,
    middleNameLatin: initialNamesLat.middleName,
    // остальное
    phone: user.phone ?? '',
    birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
    countries: initialCountries,
    cities: strToArr(user.city),
  });

  // sync при обновлении user
  useEffect(() => {
    const namesRu = splitFullName(user.fullName);
    const namesLat = splitFullName((user as any).fullNameLatin);
    const newCountries = strToArr(user.country)
      .map((n) => countryByName.get(n.toLowerCase()) || countryByIso.get(n.toUpperCase()))
      .filter(Boolean) as Option[];
    setForm({
      lastName: namesRu.lastName,
      firstName: namesRu.firstName,
      middleName: namesRu.middleName,
      lastNameLatin: namesLat.lastName,
      firstNameLatin: namesLat.firstName,
      middleNameLatin: namesLat.middleName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      countries: newCountries,
      cities: strToArr(user.city),
    });
  }, [
    user.fullName,
    (user as any).fullNameLatin,
    user.phone,
    user.birthDate,
    user.country,
    user.city,
    countryByName,
    countryByIso,
  ]);

  // при смене стран — подчистим города, которых нет в кэше выбранных стран
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
      setForm((f) => ({
        ...f,
        cities: f.cities.filter((c) => allowed.has(c.toLowerCase())),
      }));
    }
  }, [form.countries]);

  const mutation = useUpdateMe();

  const onCancel = () => {
    const namesRu = splitFullName(user.fullName);
    const namesLat = splitFullName((user as any).fullNameLatin);
    const newCountries = strToArr(user.country)
      .map((n) => countryByName.get(n.toLowerCase()) || countryByIso.get(n.toUpperCase()))
      .filter(Boolean) as Option[];
    setForm({
      lastName: namesRu.lastName,
      firstName: namesRu.firstName,
      middleName: namesRu.middleName,
      lastNameLatin: namesLat.lastName,
      firstNameLatin: namesLat.firstName,
      middleNameLatin: namesLat.middleName,
      phone: user.phone ?? '',
      birthDate: user.birthDate ? toDateInput(user.birthDate) : '',
      countries: newCountries,
      cities: strToArr(user.city),
    });
    setEdit(false);
  };

  function debounceCb<F extends (...a: any[]) => void>(fn: F, ms = 200) {
    let t: any;
    return (...args: Parameters<F>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const mergedCacheRef = useRef<Map<string, Option[]>>(new Map());
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

  const onSave = async () => {
    // русское ФИО
    const ln = titleCaseAny(form.lastName);
    const fn = titleCaseAny(form.firstName);
    const mn = form.middleName ? titleCaseAny(form.middleName) : '';
    const fullName = [ln, fn, mn].filter(Boolean).join(' ');

    // латиница (как в загранпаспорте: фамилия + имя)
    const lnLat = titleCaseAny(form.lastNameLatin);
    const fnLat = titleCaseAny(form.firstNameLatin);
    const fullNameLatin = [lnLat, fnLat].filter(Boolean).join(' ');

    const phoneIntl = normalizePhone(form.phone);
    if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
      toast.error('Неверный номер телефона');
      return;
    }

    const countryNames = form.countries.map((o) => o.label);
    const countriesStr = arrToStr(countryNames);
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

  return (
    <div className="bg-white  space-y-4" style={{ borderColor: 'var(--color-green-light)' }}>
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

          {/* Разделитель */}
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
          <Field label="Страны (латиницей)">
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

          {/* Города */}
          <Field label="Города (латиницей)">
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
