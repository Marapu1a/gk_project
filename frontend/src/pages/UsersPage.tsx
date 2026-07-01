// src/pages/UsersPage.tsx
import { UsersTable } from '@/features/admin/components/UsersTable';
import { PageNav } from '@/components/PageNav';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] px-4 py-6 text-[var(--color-blue-dark)]">
      <header className="mx-auto mb-5 grid max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PageNav />
        <h1 className="dashboard-v2-page-title text-center">Управление пользователями</h1>
        <div />
      </header>
      <UsersTable />
    </div>
  );
}
