// src/files/components/AvatarDisplay.tsx
type Props = { src?: string | null; alt?: string; w?: string; h?: string };

export function AvatarDisplay({ src, alt = 'avatar', w = 'w-28', h = 'h-20' }: Props) {
  return (
    <div className={`relative ${w} ${h} rounded-2xl bg-white overflow-hidden`}>
      <img
        src={src || '/avatar_placeholder.svg'}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  );
}
