// src/pages/UsersPage.tsx
import { UsersTable } from '@/features/admin/components/UsersTable';
import { BackButton } from '@/components/BackButton';

export default function UsersPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Управление пользователями</h1>
      <p className="text-sm text-gray-600">
        Здесь вы можете просматривать всех пользователей, изменять их роли и смотреть детали.
      </p>

      <UsersTable />

      <BackButton />
    </div>
  );
}
