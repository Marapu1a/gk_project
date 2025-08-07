import { AdminDocumentReviewList } from '@/features/documentReviewAdmin/components/AdminDocumentReviewList';
import { DashboardButton } from '@/components/DashboardButton';

export default function AdminDocumentReviewListPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminDocumentReviewList />
      <DashboardButton />
    </div>
  );
}
