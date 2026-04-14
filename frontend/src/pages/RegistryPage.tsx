// src/pages/RegistryPage.tsx
import { useNavigate } from 'react-router-dom';
import { RegistryList } from '@/features/registry/components/RegistryList';
import { DashboardButton } from '@/components/DashboardButton';

export default function RegistryPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Единый реестр поведенческих аналитиков в России</h1>

      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--color-blue-soft)',
          border: '1px solid rgba(31,48,94,0.2)',
        }}
      >
        <p className="text-sm text-blue-dark">
          В реестре представлены специалисты по прикладному анализу поведения, подтвердившие свою
          квалификацию в системе добровольной сертификации «ЦС ПАП», зарегистрированной в
          РОССТАНДАРТ 23.12.2024 № РОСС RU.З3047.04ЦВА0.
          <br />
          <br />
          Для включения в реестр необходимо выполнить требования к обучению и практике и пройти
          процедуру сертификации на соответствующий уровень, что также подтверждает квалификацию на
          <span className="font-medium"> международном уровне (IBAO)</span>.
        </p>
      </div>

      <RegistryList pageSize={18} onOpenProfile={(id) => navigate(`/registry/${id}`)} />
      <DashboardButton />
    </div>
  );
}
