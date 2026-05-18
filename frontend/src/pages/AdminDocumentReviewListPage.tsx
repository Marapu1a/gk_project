import { AdminDocumentReviewList } from '@/features/documentReviewAdmin/components/AdminDocumentReviewList';
import { DashboardButton } from '@/components/DashboardButton';
import { BackButton } from '@/components/BackButton';

export default function AdminDocumentReviewListPage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] px-4 py-6">
      <div className="mx-auto mb-5 flex max-w-[1180px] gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <AdminDocumentReviewList />
    </div>
  );
}
