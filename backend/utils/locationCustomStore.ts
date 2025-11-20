// backend/utils/locationCustomStore.ts
import fs from 'fs/promises';
import path from 'path';

const CUSTOM_LOCATION_FILE = path.join(__dirname, 'location-custom.json');

export type CustomLocationMap = Record<string, string[]>;

async function ensureFileExists() {
  try {
    await fs.access(CUSTOM_LOCATION_FILE);
  } catch {
    await fs.mkdir(path.dirname(CUSTOM_LOCATION_FILE), { recursive: true });
    await fs.writeFile(CUSTOM_LOCATION_FILE, '{}', 'utf8');
  }
}

export async function loadCustomLocations(): Promise<CustomLocationMap> {
  await ensureFileExists();

  const raw = await fs.readFile(CUSTOM_LOCATION_FILE, 'utf8');
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      return data as CustomLocationMap;
    }
  } catch {
    // если json битый – переписываем
  }

  await fs.writeFile(CUSTOM_LOCATION_FILE, '{}', 'utf8');
  return {};
}

export async function saveCustomLocations(map: CustomLocationMap): Promise<void> {
  await ensureFileExists();
  const json = JSON.stringify(map, null, 2);
  await fs.writeFile(CUSTOM_LOCATION_FILE, json, 'utf8');
}

/**
 * Регистрирует город для указанных кодов стран в json-файле.
 * Возвращает true, если файл реально изменился.
 */
export async function registerCustomCityPersistent(
  countryCodes: string[],
  city: string,
): Promise<boolean> {
  const codes = countryCodes.filter(Boolean);
  if (!codes.length) return false;

  const map = await loadCustomLocations();
  let changed = false;

  const lowerCity = city.toLowerCase();

  for (const code of codes) {
    const arr = map[code] ?? [];
    const exists = arr.some((c) => c.toLowerCase() === lowerCity);
    if (!exists) {
      arr.push(city);
      map[code] = arr;
      changed = true;
    }
  }

  if (changed) {
    await saveCustomLocations(map);
  }

  return changed;
}
