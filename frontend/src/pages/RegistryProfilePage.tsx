// src/pages/RegistryProfilePage.tsx
import { useParams } from 'react-router-dom';
import { RegistryProfile } from '@/features/registry/components/RegistryProfile';
import { BackButton } from '@/components/BackButton';

export default function RegistryProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;

  return (
    <div className="container-fixed p-6 space-y-6">
      <BackButton />
      <RegistryProfile userId={userId} />
    </div>
  );
}
