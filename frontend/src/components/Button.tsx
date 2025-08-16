// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'brand' | 'accent' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  brand: 'btn-brand',
  accent: 'btn-accent',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-3',
};

export function Button({
  loading,
  disabled,
  children,
  className,
  variant = 'brand',
  size = 'md',
  fullWidth,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'btn inline-flex items-center justify-center gap-2',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity=".25"
          />
          <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      )}
      {!loading && leftIcon}
      <span>{loading ? 'Загрузка…' : children}</span>
      {!loading && rightIcon}
    </button>
  );
}
