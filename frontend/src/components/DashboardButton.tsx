// src/components/ui/DashboardButton.tsx
import { useNavigate } from 'react-router-dom';

export function DashboardButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition"
    >
      ⌂ В кабинет
    </button>
  );
}
