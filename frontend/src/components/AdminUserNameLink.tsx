import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
  className?: string;
  children?: ReactNode;
};

export function AdminUserNameLink({ userId, fullName, email, className = '', children }: Props) {
  const fallbackLabel = fullName?.trim() || email?.trim() || 'Профиль пользователя';
  const label = children ?? fallbackLabel;

  if (!userId) {
    return <span className={className}>{label || '—'}</span>;
  }

  return (
    <Link
      to={`/admin/users/${userId}`}
      className={`cursor-pointer transition-colors hover:text-[var(--color-blue-darker)] ${className}`}
      title={typeof label === 'string' ? label : fullName?.trim() || email?.trim() || undefined}
    >
      {label}
    </Link>
  );
}
