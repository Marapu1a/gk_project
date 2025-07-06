// src/pages/UserDetailsPage.tsx
import { useParams } from 'react-router-dom';
import { UserDetails } from '@/features/admin/components/UserDetails';

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <p>Не указан ID пользователя</p>;

  return (
    <div className="p-6">
      <UserDetails userId={id} />
    </div>
  );
}
