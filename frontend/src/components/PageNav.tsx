import { BackButton } from './BackButton';
import { DashboardButton } from './DashboardButton';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AdminUserSearch } from '@/features/admin/components/AdminUserSearch';

export function PageNav({
  className = '',
  showAdminSearch = true,
}: {
  className?: string;
  showAdminSearch?: boolean;
}) {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-3 ${className}`}>
      <BackButton />
      <DashboardButton />
      {isAdmin && showAdminSearch ? (
        <AdminUserSearch
          className="hidden min-w-[260px] xl:block"
          placeholder="Найти пользователя"
          size="compact"
        />
      ) : null}
    </div>
  );
}
