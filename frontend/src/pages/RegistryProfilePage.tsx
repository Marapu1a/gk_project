// src/pages/RegistryProfilePage.tsx
import { useParams } from 'react-router-dom';
import { RegistryProfile } from '@/features/registry/components/RegistryProfile';
import { PageNav } from '@/components/PageNav';

export default function RegistryProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;

  return (
    <div className="container-fixed p-6 space-y-6">
      <PageNav />
      <RegistryProfile userId={userId} />
    </div>
  );
}
