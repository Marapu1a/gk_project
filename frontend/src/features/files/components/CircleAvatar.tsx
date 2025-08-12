// src/components/CircleAvatar.tsx
import { useState } from 'react';

type Props = {
  src?: string | null;
  name: string; // для инициалов и title
  size?: number; // px, по умолчанию 40
  className?: string;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '??';
}

export function CircleAvatar({ src, name, size = 40, className = '' }: Props) {
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;

  if (showImg) {
    return (
      <img
        src={src!}
        alt={name}
        title={name}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={`rounded-full object-cover border ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      title={name}
      className={`rounded-full border flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, rgba(31,48,94,0.08), rgba(31,48,94,0.02))',
        color: 'rgba(31,48,94,0.8)',
        fontWeight: 600,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
