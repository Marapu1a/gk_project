type DecimalInputOptions = {
  maxDecimals?: number;
  maxIntegerDigits?: number;
};

export function sanitizeDecimalInput(
  rawValue: string,
  { maxDecimals = 2, maxIntegerDigits }: DecimalInputOptions = {},
) {
  const value = rawValue.replace(/\s/g, '').replace('.', ',');
  const integerLimit = maxIntegerDigits == null ? '*' : `{0,${maxIntegerDigits}}`;
  const pattern = new RegExp(`^\\d${integerLimit}(?:,\\d{0,${maxDecimals}})?$`);

  return pattern.test(value) ? value : null;
}

export function parseDecimalInput(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDecimalInput(value: number, maxDecimals = 2) {
  const rounded = Number(value.toFixed(maxDecimals));
  return String(rounded).replace('.', ',');
}

export function normalizeDecimalInput(
  value: string,
  {
    max,
    maxDecimals = 2,
    maxIntegerDigits,
    fallback = 0,
  }: DecimalInputOptions & { max?: number | null; fallback?: number } = {},
) {
  const sanitized = sanitizeDecimalInput(value, { maxDecimals, maxIntegerDigits });
  const parsed = sanitized == null || sanitized === ',' ? null : parseDecimalInput(sanitized);

  if (parsed == null || parsed < 0) return formatDecimalInput(fallback, maxDecimals);

  const capped = max == null ? parsed : Math.min(parsed, Math.max(0, max));
  return formatDecimalInput(capped, maxDecimals);
}
