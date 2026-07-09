import ExamAppsTable from '@/features/exam/components/ExamAppsTable';
import { PageNav } from '@/components/PageNav';

export default function ExamApplicationsPage() {
  return (
    <div className="container-fixed mx-auto px-2 py-4 text-blue-dark sm:px-6">
      <header className="mb-5">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="dashboard-v2-page-title text-center">Заявки на экзамен</h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <PageNav />
          <h1 className="dashboard-v2-page-title text-center">Заявки на экзамен</h1>
          <div />
        </div>
      </header>

      <ExamAppsTable />
    </div>
  );
}
