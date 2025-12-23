// src/utils/locationDictionary.ts

export type LocationOption = { value: string; label: string; meta?: any };

export type CountryEntry = {
  code: string;
  label: string;
  cities: string[];
};

// Небольшой справочник стран и крупных/известных городов (РУССКИЙ ЯЗЫК)
export const COUNTRY_CITY_DATA: CountryEntry[] = [
  // --- СНГ / ближнее зарубежье ---
  {
    code: 'RU',
    label: 'Россия',
    cities: [
      'Москва',
      'Санкт-Петербург',
      'Новосибирск',
      'Екатеринбург',
      'Казань',
      'Нижний Новгород',
      'Самара',
      'Ростов-на-Дону',
      'Краснодар',
      'Уфа',
      'Пермь',
      'Воронеж',
      'Волгоград',
      'Омск',
      'Челябинск',
      'Красноярск',
      'Тюмень',
      'Иркутск',
      'Хабаровск',
      'Владивосток',
    ],
  },
  {
    code: 'BY',
    label: 'Беларусь',
    cities: ['Минск', 'Гомель', 'Гродно', 'Брест', 'Витебск', 'Могилёв'],
  },
  {
    code: 'KZ',
    label: 'Казахстан',
    cities: ['Астана', 'Алматы', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар'],
  },
  {
    code: 'AM',
    label: 'Армения',
    cities: ['Ереван', 'Гюмри', 'Ванадзор'],
  },
  {
    code: 'GE',
    label: 'Грузия',
    cities: ['Тбилиси', 'Батуми', 'Кутаиси'],
  },
  {
    code: 'AZ',
    label: 'Азербайджан',
    cities: ['Баку', 'Гянджа', 'Сумгаит'],
  },
  {
    code: 'MD',
    label: 'Молдова',
    cities: ['Кишинёв', 'Бельцы'],
  },
  {
    code: 'KG',
    label: 'Киргизия',
    cities: ['Бишкек', 'Ош'],
  },
  {
    code: 'UZ',
    label: 'Узбекистан',
    cities: ['Ташкент', 'Самарканд', 'Бухара', 'Наманган', 'Фергана'],
  },
  {
    code: 'TJ',
    label: 'Таджикистан',
    cities: ['Душанбе', 'Худжанд'],
  },

  // --- Европа ---
  {
    code: 'DE',
    label: 'Германия',
    cities: [
      'Берлин',
      'Мюнхен',
      'Гамбург',
      'Франкфурт-на-Майне',
      'Кёльн',
      'Штутгарт',
      'Дюссельдорф',
    ],
  },
  {
    code: 'RS',
    label: 'Сербия',
    cities: [
      'Белград',
      'Нови-Сад',
      'Ниш',
      'Крагуевац',
      'Суботица',
    ],
  },
  {
    code: 'PL',
    label: 'Польша',
    cities: ['Варшава', 'Краков', 'Вроцлав', 'Гданьск', 'Познань', 'Лодзь'],
  },
  {
    code: 'CZ',
    label: 'Чехия',
    cities: ['Прага', 'Брно', 'Острава', 'Пльзень'],
  },
  {
    code: 'LT',
    label: 'Литва',
    cities: ['Вильнюс', 'Каунас', 'Клайпеда'],
  },
  {
    code: 'LV',
    label: 'Латвия',
    cities: ['Рига', 'Даугавпилс', 'Лиепая'],
  },
  {
    code: 'EE',
    label: 'Эстония',
    cities: ['Таллин', 'Тарту', 'Нарва'],
  },
  {
    code: 'FI',
    label: 'Финляндия',
    cities: ['Хельсинки', 'Эспоо', 'Тампере'],
  },
  {
    code: 'SE',
    label: 'Швеция',
    cities: ['Стокгольм', 'Гётеборг', 'Мальмё'],
  },
  {
    code: 'NO',
    label: 'Норвегия',
    cities: ['Осло', 'Берген', 'Ставангер'],
  },
  {
    code: 'NL',
    label: 'Нидерланды',
    cities: ['Амстердам', 'Роттердам', 'Гаага', 'Утрехт'],
  },
  {
    code: 'BE',
    label: 'Бельгия',
    cities: ['Брюссель', 'Антверпен', 'Гент'],
  },
  {
    code: 'FR',
    label: 'Франция',
    cities: ['Париж', 'Лион', 'Ницца', 'Марсель', 'Тулуза', 'Бордо'],
  },
  {
    code: 'ES',
    label: 'Испания',
    cities: ['Барселона', 'Мадрид', 'Валенсия', 'Севилья', 'Малага'],
  },
  {
    code: 'IT',
    label: 'Италия',
    cities: ['Рим', 'Милан', 'Флоренция', 'Неаполь', 'Турин', 'Болонья'],
  },
  {
    code: 'PT',
    label: 'Португалия',
    cities: ['Лиссабон', 'Порту', 'Брага'],
  },
  {
    code: 'CH',
    label: 'Швейцария',
    cities: ['Цюрих', 'Женева', 'Базель', 'Лозанна'],
  },
  {
    code: 'AT',
    label: 'Австрия',
    cities: ['Вена', 'Зальцбург', 'Грац', 'Инсбрук'],
  },
  {
    code: 'GB',
    label: 'Великобритания',
    cities: ['Лондон', 'Манчестер', 'Бирмингем', 'Ливерпуль', 'Эдинбург'],
  },

  // --- Ближний Восток / Средиземноморье ---
  {
    code: 'TR',
    label: 'Турция',
    cities: ['Стамбул', 'Анкара', 'Анталья', 'Измир', 'Бурса', 'Аланья'],
  },
  {
    code: 'CY',
    label: 'Кипр',
    cities: ['Никосия', 'Лимасол', 'Ларнака', 'Пафос'],
  },
  {
    code: 'GR',
    label: 'Греция',
    cities: ['Афины', 'Салоники', 'Ираклион'],
  },
  {
    code: 'IL',
    label: 'Израиль',
    cities: ['Тель-Авив', 'Иерусалим', 'Хайфа', 'Беэр-Шева'],
  },
  {
    code: 'AE',
    label: 'ОАЭ',
    cities: ['Дубай', 'Абу-Даби', 'Шарджа'],
  },

  // --- Америка / Азия ---
  {
    code: 'US',
    label: 'США',
    cities: [
      'Нью-Йорк',
      'Лос-Анджелес',
      'Чикаго',
      'Сан-Франциско',
      'Майами',
      'Бостон',
      'Сиэтл',
      'Хьюстон',
    ],
  },
  {
    code: 'CA',
    label: 'Канада',
    cities: ['Торонто', 'Монреаль', 'Ванкувер', 'Оттава', 'Калгари'],
  },
  {
    code: 'AU',
    label: 'Австралия',
    cities: ['Сидней', 'Мельбурн', 'Брисбен', 'Перт', 'Аделаида'],
  },
  {
    code: 'TH',
    label: 'Таиланд',
    cities: ['Бангкок', 'Пхукет', 'Чиангмай', 'Паттайя'],
  },
  {
    code: 'VN',
    label: 'Вьетнам',
    cities: ['Ханой', 'Хошимин', 'Дананг', 'Нячанг'],
  },
  {
    code: 'CN',
    label: 'Китай',
    cities: ['Пекин', 'Шанхай', 'Гуанчжоу', 'Шэньчжэнь', 'Чэнду'],
  },
  {
    code: 'JP',
    label: 'Япония',
    cities: ['Токио', 'Осака', 'Киото', 'Йокогама'],
  },
];

export const COUNTRY_OPTIONS: LocationOption[] = COUNTRY_CITY_DATA.map((c) => ({
  value: c.code,
  label: c.label,
  meta: c,
}));

const COUNTRY_BY_CODE = new Map<string, CountryEntry>(
  COUNTRY_CITY_DATA.map((c) => [c.code, c]),
);

// дополнительная карта пользовательских городов
const CUSTOM_CITY_MAP = new Map<string, Set<string>>();

// ===== РЕГИСТРАЦИЯ НОВОГО ГОРОДА =====

export function registerCustomCity(countryCodes: string[], city: string) {
  const normalized = city.trim();
  const lower = normalized.toLowerCase();

  for (const code of countryCodes) {
    if (!code) continue;

    let set = CUSTOM_CITY_MAP.get(code);
    if (!set) {
      set = new Set<string>();
      CUSTOM_CITY_MAP.set(code, set);
    }

    const alreadyInStatic =
      COUNTRY_BY_CODE.get(code)?.cities.some((c) => c.toLowerCase() === lower) ?? false;
    const alreadyInCustom = Array.from(set).some((c) => c.toLowerCase() === lower);

    if (!alreadyInStatic && !alreadyInCustom) {
      set.add(normalized);
    }
  }
}

// ===== ПУЛ ГОРОДОВ =====

export const buildCityPoolForCountries = (codes: string[]): LocationOption[] => {
  const pool: LocationOption[] = [];
  const seen = new Set<string>();

  for (const code of codes) {
    const country = COUNTRY_BY_CODE.get(code);
    if (country) {
      for (const city of country.cities) {
        const key = `${code}:${city.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        pool.push({
          value: `${city}|||${code}`,
          label: city,
          meta: { countryCode: code },
        });
      }
    }

    const customSet = CUSTOM_CITY_MAP.get(code);
    if (customSet) {
      for (const city of customSet) {
        const key = `${code}:${city.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        pool.push({
          value: `${city}|||${code}`,
          label: city,
          meta: { countryCode: code, custom: true },
        });
      }
    }
  }

  return pool;
};

// ===== ВАЛИДАЦИЯ =====

const RU_WORD_RE = /^(?:[А-ЯЁа-яё]+(?:-[А-ЯЁа-яё]+)*)$/u;

export function normalizeRussianCityName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const words = cleaned.split(' ').filter(Boolean);

  const normWords = words.map((word) => {
    const parts = word.split('-').filter(Boolean);
    const normParts = parts.map((part) => {
      const lower = part.toLowerCase();
      const first = lower.charAt(0).toLocaleUpperCase('ru-RU');
      const rest = lower.slice(1);
      return first + rest;
    });
    return normParts.join('-');
  });

  return normWords.join(' ');
}

export function isValidRussianCityName(raw: string): boolean {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return false;
  if (cleaned.length < 2 || cleaned.length > 50) return false;
  if (cleaned.includes('  ')) return false;

  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return false;

  return words.every((w) => w.length <= 30 && RU_WORD_RE.test(w));
}
