// src/pages/RegistryPage.tsx
import { useNavigate } from 'react-router-dom';
import { RegistryList } from '@/features/registry/components/RegistryList';
import { DashboardButton } from '@/components/DashboardButton';

export default function RegistryPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Единый реестр поведенческих аналитиков в России</h1>

      <div className="rounded-[20px] bg-[#1F305E] px-6 py-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,0.85fr)_auto] lg:items-center">
          <p className="text-[15px] leading-[1.35]">
            Здесь представлены специалисты по прикладному анализу поведения, подтвердившие свою
            квалификацию в системе добровольной сертификации «ЦС ПАП», зарегистрированной в
            РОССТАНДАРТ 23.12.2024 № РОСС RU.33047.04ЦВА0
          </p>

          <div className="hidden h-full min-h-[76px] w-px bg-white/80 lg:block" aria-hidden="true" />

          <p className="text-[15px] leading-[1.35]">
            Для включения в реестр необходимо пройти обучение, практику и процедуру сертификации,
            которая также подтверждает квалификацию на международном уровне «IBAO»
          </p>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="inline-flex h-[54px] min-w-[170px] cursor-pointer items-center justify-center rounded-[10px] bg-white px-5 text-center text-[16px] font-extrabold leading-tight text-[#1F305E] transition-colors hover:bg-[#F5F7FA] active:bg-[#E7F1F4]"
          >
            Регистрация<br />в реестре
          </button>
        </div>
      </div>

      <RegistryList pageSize={18} onOpenProfile={(id) => navigate(`/registry/${id}`)} />
      <DashboardButton />
    </div>
  );
}
