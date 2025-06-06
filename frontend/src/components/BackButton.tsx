import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="text-blue-dark hover:underline text-sm mt-6 font-sans"
    >
      ← Назад
    </button>
  );
}
