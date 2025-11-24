import ExamAppsTable from '@/features/exam/components/ExamAppsTable';
import { BackButton } from '@/components/BackButton';
import { DashboardButton } from '@/components/DashboardButton';

export default function ExamApplicationsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Заявки на экзамен</h1>

      {/* Верхняя панель кнопок */}
      <div className="flex gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <ExamAppsTable />

      {/* Нижняя панель кнопок */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <BackButton />
        <DashboardButton />
      </div>
    </div>
  );
}
