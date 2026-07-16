import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type AuthScreenProps = {
  title: string;
  children: ReactNode;
  maxWidth?: string;
};

export function AuthScreen({ title, children, maxWidth = 'max-w-[380px]' }: AuthScreenProps) {
  return (
    <div className="px-4 pb-10 pt-3 text-blue-dark">
      <div className={cn('mx-auto w-full', maxWidth)}>
        <h1 className="mb-6 text-center text-[24px] font-extrabold leading-tight text-blue-dark">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card-section shadow-soft px-5 py-6 md:px-6', className)}>
      {children}
    </div>
  );
}

export function AuthField({
  label,
  hint,
  required,
  children,
  error,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <label className={cn('block text-[14px] font-medium text-blue-dark', className)}>
      {label}
      {hint ? <span className="ml-1 font-normal text-[#8D96B5]">{hint}</span> : null}
      {required ? <span className="ml-1 text-[var(--color-danger)]">*</span> : null}
      <div className="mt-1">{children}</div>
      {error ? <p className="text-error">{error}</p> : null}
    </label>
  );
}

export function AuthSubmitButton({
  children,
  disabled,
  loading,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'btn btn-dark h-[52px] w-full rounded-[10px] px-8 text-[16px] font-extrabold',
        'auth-submit',
        className,
      )}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
}

export function PasswordInput({
  valueVisible,
  onToggleVisible,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  valueVisible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div className="relative">
      <input
        {...props}
        type={valueVisible ? 'text' : 'password'}
        className={cn('input-design input-design-trailing-icon h-[32px]', className)}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8D96B5] hover:text-[var(--color-blue-dark)]"
        aria-label={valueVisible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {valueVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export const SUPPORT_URL = 'https://reestrpap.ru/contacts';

export function AuthFooterLinks() {
  return (
    <div className="mt-7 flex flex-col items-center gap-3 text-center">
      <nav
        aria-label="Навигация авторизации"
        className="inline-flex h-[32px] items-center rounded-full border border-[#B8C4D8] bg-white/70 px-4 text-[14px] text-blue-dark shadow-[0_4px_10px_rgba(0,0,0,0.04)]"
      >
        <Link to="/register" className="hover:underline">
          Регистрация
        </Link>
        <span className="mx-3 h-[14px] w-px bg-[#B8C4D8]" aria-hidden="true" />
        <Link to="/login" className="hover:underline">
          Вход
        </Link>
      </nav>

      <a href={SUPPORT_URL} className="text-[15px] text-blue-dark underline">
        Служба поддержки
      </a>
    </div>
  );
}
