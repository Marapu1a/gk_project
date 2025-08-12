import ExamAppsTable from '@/features/exam/components/ExamAppsTable';

export default function ExamApplicationsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-blue-dark">Заявки на экзамен</h1>
      <ExamAppsTable />
    </div>
  );
}
