// src/pages/UsersPage.tsx
import { UsersTable } from '@/features/admin/components/UsersTable';
import { PageNav } from '@/components/PageNav';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] px-2 py-6 text-[var(--color-blue-dark)] sm:px-4">
      <div className="mx-auto mb-5 max-w-[1180px]">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="dashboard-v2-page-title text-center">Управление пользователями</h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <header className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <PageNav />
          <h1 className="dashboard-v2-page-title text-center">Управление пользователями</h1>
          <div />
        </header>
      </div>
      <UsersTable />
    </div>
  );
}
