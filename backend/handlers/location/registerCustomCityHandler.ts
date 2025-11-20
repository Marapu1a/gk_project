// src/handlers/location/registerCustomCityHandler.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type RegisterCityBody = {
  countryCodes: string[];
  city: string;
};

// слово: только русские буквы, допускаем дефисы между частями
const RU_WORD_RE = /^(?:[А-ЯЁа-яё]+(?:-[А-ЯЁа-яё]+)*)$/u;

function normalizeRussianCityName(raw: string): string {
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

function isValidRussianCityName(raw: string): boolean {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return false;
  if (cleaned.length < 2 || cleaned.length > 50) return false;

  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return false;

  return words.every((w) => w.length <= 30 && RU_WORD_RE.test(w));
}

export async function registerCustomCityHandler(req: FastifyRequest, reply: FastifyReply) {
  const { countryCodes, city } = req.body as RegisterCityBody;

  if (!countryCodes || !Array.isArray(countryCodes) || countryCodes.length === 0) {
    return reply.code(400).send({ error: 'Не указана страна.' });
  }

  if (!city || typeof city !== 'string') {
    return reply.code(400).send({ error: 'Не указано название города.' });
  }

  const normalized = normalizeRussianCityName(city);

  if (!isValidRussianCityName(normalized)) {
    return reply.code(400).send({
      error:
        'Город должен быть на русском: буквы А–Я/Ё, пробелы и дефисы. Без латиницы и цифр.',
    });
  }

  const uniqueCodes = Array.from(new Set(countryCodes.filter(Boolean)));

  // юзера берём из verifyToken, как в других хендлерах
  const userId = (req as any).user?.userId ?? null;

  try {
    // без upsert, чтобы не завязываться на имя @@unique
    for (const code of uniqueCodes) {
      const exists = await prisma.customCity.findFirst({
        where: { countryCode: code, name: normalized },
      });

      if (!exists) {
        await prisma.customCity.create({
          data: {
            countryCode: code,
            name: normalized,
            createdById: userId,
          },
        });
      }
    }

    return reply.send({
      ok: true,
      saved: true,
      city: normalized,
      countryCodes: uniqueCodes,
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to register custom city');
    return reply.code(500).send({ error: 'Не удалось сохранить город' });
  }
}
