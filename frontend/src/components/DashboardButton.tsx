// src/components/ui/DashboardButton.tsx
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export function DashboardButton() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const label = user?.role === 'ADMIN' ? 'Панель администратора' : 'В личный кабинет';

  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard-v2')}
      className="btn h-[30px] min-w-[104px] cursor-pointer rounded-full bg-[var(--color-blue-dark)] px-4 text-[14px] font-extrabold text-white transition hover:bg-[var(--color-blue-darker)]"
    >
      {label}
    </button>
  );
}
