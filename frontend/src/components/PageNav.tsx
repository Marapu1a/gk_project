import { BackButton } from './BackButton';
import { DashboardButton } from './DashboardButton';

export function PageNav({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-3 ${className}`}>
      <BackButton />
      <DashboardButton />
    </div>
  );
}
