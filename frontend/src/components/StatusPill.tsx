// components/StatusPill.tsx
import type { ReactNode } from 'react';

type StatusPillProps = {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'red';
};

export function StatusPill({ children, tone = 'blue' }: StatusPillProps) {
  const bg =
    tone === 'green'
      ? 'var(--color-green-brand)'
      : tone === 'red'
        ? '#ef4444'
        : 'var(--color-blue-dark)';

  return (
    <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: bg }}>
      {children}
    </span>
  );
}
