// src/pages/RegistryProfilePage.tsx
import { useNavigate, useParams } from 'react-router-dom';
import { RegistryProfile } from '@/features/registry/components/RegistryProfile';
import { ArrowLeft } from 'lucide-react';

export default function RegistryProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  if (!userId) return null;

  return (
    <div className="mx-auto max-w-[1220px] px-4 py-5 space-y-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/registry')}
          className="btn inline-flex h-[30px] min-w-[88px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#A7B1C7] bg-white px-3 text-[14px] font-medium text-[#1F305E] transition hover:bg-[var(--color-blue-soft)] active:bg-[#E7F1F4]"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          <span>Реестр</span>
        </button>
        <h1 className="text-center text-[24px] font-extrabold text-[var(--color-blue-dark)]">
          Детали специалиста
        </h1>
        <div className="w-[88px]" aria-hidden="true" />
      </header>

      <RegistryProfile userId={userId} />
    </div>
  );
}
