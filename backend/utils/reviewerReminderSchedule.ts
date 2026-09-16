// Deliberately no catch-up mailing on other dates. A missed run requires review.
export function reminderSlot(now = new Date()): string | null {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  if (!['05', '20'].includes(parts.day) || Number(parts.hour) < 10) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}
