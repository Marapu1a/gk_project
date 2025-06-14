// src/components/ui/BackButton.tsx
import { useNavigate } from 'react-router-dom';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(-1)} className="btn btn-secondary">
      ← Назад
    </button>
  );
}
