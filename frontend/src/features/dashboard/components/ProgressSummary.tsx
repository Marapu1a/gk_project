// src/features/dashboard/components/ProgressSummary.tsx
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

interface User {
  fullName: string;
  id: string;
}

export function ProgressSummary({ user }: { user: User }) {
  return (
    <div className="border p-4 rounded shadow-sm">
      <h2 className="text-xl font-semibold mb-2 text-blue-dark">Прогресс CEU и супервизии</h2>
      <CeuSummaryBlock />
      <SupervisionSummaryBlock />
    </div>
  );
}
