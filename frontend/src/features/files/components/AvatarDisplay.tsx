// src/features/files/components/AvatarDisplay.tsx
type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  w?: string; // tailwind width, по умолчанию как в реестре
  h?: string; // tailwind height
};

export function AvatarDisplay({ src, alt, className, w = 'w-28', h = 'h-20' }: Props) {
  const placeholder = '/avatar_placeholder.svg';

  return (
    <div className={`relative ${w} ${h} rounded-2xl bg-white overflow-hidden ${className ?? ''}`}>
      <img
        src={src || placeholder}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-contain"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src.endsWith('avatar_placeholder.svg')) return; // не зацикливаемся
          el.src = placeholder;
        }}
      />
    </div>
  );
}
