// src/components/ui/DashboardButton.tsx
import { useNavigate } from 'react-router-dom';

export function DashboardButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard-v2')}
      className="btn h-[30px] min-w-[104px] cursor-pointer rounded-full bg-[var(--color-blue-dark)] px-4 text-[14px] font-extrabold text-white transition hover:bg-[var(--color-blue-darker)]"
    >
      В профиль
    </button>
  );
}
