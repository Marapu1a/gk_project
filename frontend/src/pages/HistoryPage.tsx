// src/pages/HistoryPage.tsx
import { BackButton } from '@/components/BackButton';
import { CeuHistoryTable } from '@/features/ceu/components/CeuHistoryTable';
import { SupervisionHistoryTable } from '@/features/supervision/components/SupervisionHistoryTable';

export default function HistoryPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">История активности</h1>

      <CeuHistoryTable />
      <SupervisionHistoryTable />

      <BackButton />
    </div>
  );
}
