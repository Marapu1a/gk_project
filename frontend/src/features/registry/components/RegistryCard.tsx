// src/features/registry/components/RegistryCard.tsx
type Props = {
  id: string;
  fullName: string;
  country?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  groupName?: string | null; // ← статус/группа
  onOpenProfile?: (userId: string) => void;
};

export function RegistryCard({
  id,
  fullName,
  country,
  city,
  avatarUrl,
  groupName,
  onOpenProfile,
}: Props) {
  const location = [country, city].filter(Boolean).join(', ');
  const placeholder = '/avatar_placeholder.svg';

  const clickable = Boolean(onOpenProfile);

  return (
    <div
      className={[
        'rounded-2xl border bg-white header-shadow overflow-hidden',
        clickable ? 'cursor-pointer hover:bg-black/5 transition-colors' : '',
      ].join(' ')}
      style={{ borderColor: 'var(--color-green-light)' }}
      onClick={() => onOpenProfile?.(id)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenProfile!(id);
        }
      }}
    >
      <div className="grid grid-cols-3">
        {/* Левая колонка: ~1/3 */}
        <div
          className="col-span-1 p-4 flex items-center justify-center border-r"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white overflow-hidden">
            <img
              src={avatarUrl || placeholder}
              alt={fullName}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src.endsWith('avatar_placeholder.svg')) return;
                el.src = placeholder;
              }}
            />
          </div>
        </div>

        {/* Правая колонка: ~2/3 */}
        <div className="col-span-2 p-4 min-w-0">
          {/* Имя — переносим, не обрезаем */}
          <div className="font-semibold leading-tight wrap-break-word">{fullName}</div>

          {/* Статус под именем — только группа */}
          {groupName && (
            <div className="mt-1">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs"
                style={{ color: 'var(--color-white)', background: badgeColor(groupName) }}
              >
                {groupName}
              </span>
            </div>
          )}

          {/* Локация */}
          <div className="text-sm text-gray-600 mt-2 wrap-break-word">{location || '—'}</div>
        </div>
      </div>
    </div>
  );
}

// Подсветка статуса (минимальный маппинг)
function badgeColor(groupName: string) {
  switch (groupName.toLowerCase()) {
    case 'инструктор':
      return '#a16207'; // янтарный
    case 'куратор':
      return '#6d28d9'; // фиолетовый
    case 'супервизор':
      return '#1f355e'; // тёмно-синий
    case 'опытный супервизор':
      return '#0f766e'; // тил
    default:
      return 'var(--color-blue-dark)';
  }
}
