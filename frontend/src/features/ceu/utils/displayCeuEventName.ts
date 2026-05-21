export function displayCeuEventName(value: string | null | undefined) {
  const name = value?.trim();
  if (!name) return '—';
  if (name === 'God-mode update') return 'Корректировка CEU-баллов';
  return name;
}
