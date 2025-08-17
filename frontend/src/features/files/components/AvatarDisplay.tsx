// src/features/files/components/AvatarDisplay.tsx
import { Camera } from 'lucide-react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  w?: string; // tailwind width
  h?: string; // tailwind height
  onClick?: () => void; // ← добавили
  editable?: boolean; // ← добавили (показывает оверлей)
};

export function AvatarDisplay({
  src,
  alt,
  className,
  w = 'w-28',
  h = 'h-28',
  onClick,
  editable = false,
}: Props) {
  const placeholder = '/avatar_placeholder.svg';
  const clickable = Boolean(onClick);

  return (
    <div
      className={`relative ${w} ${h} rounded-2xl bg-white overflow-hidden ${
        className ?? ''
      } ${clickable ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      aria-label={clickable ? (editable ? 'Изменить аватар' : 'Открыть') : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      title={editable ? 'Нажмите, чтобы изменить аватар' : undefined}
    >
      <img
        src={src || placeholder}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-contain"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          if (el.src.endsWith('avatar_placeholder.svg')) return;
          el.src = placeholder;
        }}
      />

      {editable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full px-2 py-1 bg-white/90 flex items-center gap-1 text-xs">
            <Camera size={14} />
            <span>Изменить</span>
          </div>
        </div>
      )}
    </div>
  );
}
