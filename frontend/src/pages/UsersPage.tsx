// src/pages/UsersPage.tsx
import { UsersTable } from '@/features/admin/components/UsersTable';
import { BackButton } from '@/components/BackButton';
import { DashboardButton } from '@/components/DashboardButton';

export default function UsersPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Управление пользователями</h1>
      <p className="text-sm text-gray-600">
        Здесь вы можете просматривать всех пользователей, изменять их роли и смотреть детали.
      </p>

      {/* Верхняя панель кнопок */}
      <div className="flex gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <UsersTable />

      {/* Нижняя панель кнопок */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <BackButton />
        <DashboardButton />
      </div>
    </div>
  );
}
