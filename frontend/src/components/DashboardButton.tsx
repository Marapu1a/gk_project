// src/components/ui/DashboardButton.tsx
import { useNavigate } from 'react-router-dom';

export function DashboardButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="btn btn-accent inline-flex items-center gap-2 text-sm"
    >
      ⌂ В кабинет
    </button>
  );
}
