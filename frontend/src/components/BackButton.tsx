import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="text-gray-600 hover:underline text-sm"
    >
      ← Назад
    </button>
  );
}
