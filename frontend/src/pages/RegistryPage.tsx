// src/pages/RegistryPage.tsx
import { useNavigate } from 'react-router-dom';
import { RegistryList } from '@/features/registry/components/RegistryList';
import { DashboardButton } from '@/components/DashboardButton';

export default function RegistryPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Реестр</h1>
      <RegistryList pageSize={18} onOpenProfile={(id) => navigate(`/registry/${id}`)} />
      <DashboardButton />
    </div>
  );
}
