// src/components/ui/BackButton.tsx
import { useNavigate } from 'react-router-dom';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="btn h-[30px] min-w-[88px] cursor-pointer rounded-full border border-[#A7B1C7] px-3 text-[14px] font-medium text-[#1F305E] transition hover:bg-white active:bg-[#E7F1F4]"
    >
      ← Назад
    </button>
  );
}
