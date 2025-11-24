// src/features/user/components/UserLocationFields.tsx
import { useEffect, useMemo } from 'react';
import Select from 'react-select';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { toast } from 'sonner';

import {
  COUNTRY_OPTIONS,
  buildCityPoolForCountries,
  normalizeRussianCityName,
  isValidRussianCityName,
  registerCustomCity, // runtime-регистрация
  type LocationOption as Option,
} from '@/utils/locationDictionary';

type Props = {
  countries: string[];
  cities: string[];
  onChange: (value: { countries: string[]; cities: string[] }) => void;
};

function debounceCb<F extends (...a: any[]) => void>(fn: F, ms = 200) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function UserLocationFields({ countries, cities, onChange }: Props) {
  // сопоставляем сохранённые названия стран (строки) с опциями
  const selectedCountryOptions: Option[] = useMemo(() => {
    const byLabel = new Map(COUNTRY_OPTIONS.map((o) => [o.label.toLowerCase(), o]));
    return countries.map((name) => {
      const hit = byLabel.get(name.toLowerCase());
      return hit ?? { value: name, label: name };
    });
  }, [countries]);

  const buildPool = (codes: string[]) => buildCityPoolForCountries(codes);

  // дефолтные города, которые показываем сразу при фокусе (до ввода)
  const defaultCityOptions: Option[] = useMemo(() => {
    const codes = selectedCountryOptions.map((c) => c.value);
    if (!codes.length) return [];
    return buildPool(codes).slice(0, 5);
  }, [selectedCountryOptions]);

  const loadCityOptions = useMemo(() => {
    return debounceCb((inputValue: string, callback: (opts: Option[]) => void) => {
      const q = (inputValue || '').trim().toLowerCase();
      const codes = selectedCountryOptions.map((c) => c.value);

      if (!codes.length) {
        callback([]);
        return;
      }

      const pool = buildPool(codes);

      if (!q) {
        callback(pool.slice(0, 50));
        return;
      }

      const res = pool.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
      callback(res);
    }, 200);
  }, [selectedCountryOptions]);

  const currentCityOptions: Option[] = useMemo(() => {
    const codes = selectedCountryOptions.map((c) => c.value);
    const pool = buildPool(codes);
    const res: Option[] = [];

    for (const name of cities) {
      const hit = pool.find((o) => o.label.toLowerCase() === name.toLowerCase()) ?? null;
      res.push(hit ?? { value: name, label: name });
    }

    return res;
  }, [cities, selectedCountryOptions]);

  // При смене стран — чистим города, которых уже нет среди доступных
  useEffect(() => {
    const codes = selectedCountryOptions.map((c) => c.value);

    if (!codes.length) {
      if (cities.length) {
        onChange({ countries, cities: [] });
      }
      return;
    }

    const pool = buildPool(codes);
    const allowed = new Set(pool.map((o) => o.label.toLowerCase()));

    if (allowed.size === 0) return;

    const filtered = cities.filter((c) => allowed.has(c.toLowerCase()));
    if (filtered.length !== cities.length) {
      onChange({ countries, cities: filtered });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, cities, selectedCountryOptions]);

  // Создание нового города руками + отправка на бэк
  const handleCreateCity = async (inputValue: string) => {
    const normalized = normalizeRussianCityName(inputValue);

    if (!isValidRussianCityName(normalized)) {
      toast.error(
        'Город должен быть на русском: буквы А–Я/Ё, пробелы и дефисы. Без латиницы и цифр.',
      );
      return;
    }

    const codes = selectedCountryOptions.map((c) => c.value);
    if (!codes.length) {
      toast.error('Сначала выберите страну.');
      return;
    }

    const exists = cities.some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (exists) return;

    // 1) в runtime-библиотеку — чтобы сразу появлялся в списке
    registerCustomCity(codes, normalized);

    // 2) в локальное состояние пользователя
    onChange({ countries, cities: [...cities, normalized] });

    // 3) fire-and-forget на бэк, чтобы записать в БД
    try {
      await fetch('/api/location/custom-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ countryCodes: codes, city: normalized }),
      });
    } catch (e) {
      console.error('Failed to persist custom city', e);
    }
  };

  return (
    <>
      <div>
        <label className="block text-sm mb-1 text-blue-dark">Страны</label>
        <Select
          isMulti
          options={COUNTRY_OPTIONS}
          value={selectedCountryOptions}
          onChange={(opts) => {
            const nextCountries = ((opts as Option[]) ?? []).map((o) => o.label);
            onChange({ countries: nextCountries, cities });
          }}
          classNamePrefix="select"
          placeholder="Начните вводить страну…"
          isClearable
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-blue-dark">Города</label>
        <AsyncCreatableSelect
          isMulti
          cacheOptions
          defaultOptions={defaultCityOptions}
          loadOptions={loadCityOptions}
          value={currentCityOptions}
          onChange={(opts) => {
            const names = ((opts as Option[]) ?? []).map((o) => o.label);
            onChange({ countries, cities: names });
          }}
          onCreateOption={handleCreateCity}
          classNamePrefix="select"
          placeholder={
            selectedCountryOptions.length ? 'Начните вводить город…' : 'Сначала выберите страну'
          }
          isDisabled={!selectedCountryOptions.length}
          isClearable
          noOptionsMessage={() => 'Ничего не найдено'}
          formatCreateLabel={(inputValue) => `Добавить город «${inputValue}»`}
        />
      </div>
    </>
  );
}
