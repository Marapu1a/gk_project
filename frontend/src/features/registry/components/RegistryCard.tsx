// src/features/registry/components/RegistryCard.tsx
type Props = {
  id: string;
  fullName: string;
  country?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  onOpenProfile?: (userId: string) => void;
};

export function RegistryCard({ id, fullName, country, city, avatarUrl, onOpenProfile }: Props) {
  const location = [country, city].filter(Boolean).join(', ');
  const placeholder = '/avatar_placeholder.svg';

  return (
    <div
      className="rounded-2xl border p-4 bg-white flex items-center gap-4 header-shadow"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div className="relative w-28 h-20 rounded-2xl bg-white overflow-hidden">
        <img
          src={avatarUrl || placeholder}
          alt={fullName}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain"
          onError={(e) => {
            const el = e.currentTarget;
            // если уже стоит плейсхолдер — не зацикливаемся
            if (el.src.endsWith('avatar_placeholder.svg')) return;
            el.src = placeholder;
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{fullName}</div>
        <div className="text-sm text-gray-600">{location || '—'}</div>
      </div>

      {onOpenProfile && (
        <button className="btn btn-accent" onClick={() => onOpenProfile(id)}>
          Открыть
        </button>
      )}
    </div>
  );
}
