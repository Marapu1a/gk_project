import ExamAppsTable from '@/features/exam/components/ExamAppsTable';
import { DashboardButton } from '@/components/DashboardButton';

export default function ExamApplicationsPage() {
  return (
    <div className="container-fixed mx-auto px-5 py-4 text-blue-dark sm:px-6">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <DashboardButton />
        </div>
        <h1 className="dashboard-v2-page-title text-center">Заявки на экзамен</h1>
        <div />
      </header>

      <ExamAppsTable />
    </div>
  );
}
