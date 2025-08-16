// src/components/ui/BackButton.tsx
import { useNavigate } from 'react-router-dom';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="btn btn-ghost inline-flex items-center gap-2 text-sm"
    >
      ← Назад
    </button>
  );
}
