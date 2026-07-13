import type { HTMLAttributes, ReactNode } from 'react';

export type StatusPillTone =
  | 'blue'
  | 'green'
  | 'red'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'partial'
  | 'muted';

type StatusPillProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: ReactNode;
  tone?: StatusPillTone;
  size?: 'sm' | 'md' | 'custom';
};

const toneClasses: Record<StatusPillTone, string> = {
  blue: 'bg-[var(--color-blue-dark)] text-white',
  green: 'bg-[var(--color-green-brand)] text-white',
  red: 'bg-[var(--color-danger)] text-white',
  info: 'bg-[var(--color-blue-soft)] text-[var(--color-blue-dark)]',
  success: 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]',
  warning: 'bg-[#FFF0C2] text-[#8A6200]',
  danger: 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]',
  neutral: 'bg-[#EEF0F4] text-[#6B7894]',
  partial: 'bg-[#C9D8FF] text-[var(--color-blue-dark)]',
  muted: 'bg-[var(--color-blue-soft)] text-[#8D96B5]',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'min-h-[26px] px-3 text-[12px] font-extrabold',
  custom: '',
};

export function StatusPill({
  children,
  tone = 'blue',
  size = 'sm',
  className = '',
  ...props
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
