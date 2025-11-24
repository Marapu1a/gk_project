import { AdminDocumentReviewList } from '@/features/documentReviewAdmin/components/AdminDocumentReviewList';
import { DashboardButton } from '@/components/DashboardButton';
import { BackButton } from '@/components/BackButton';

export default function AdminDocumentReviewListPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Верхняя панель кнопок */}
      <div className="flex gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <AdminDocumentReviewList />

      {/* Нижняя панель кнопок */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <BackButton />
        <DashboardButton />
      </div>
    </div>
  );
}
