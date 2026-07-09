import { AdminDocumentReviewList } from '@/features/documentReviewAdmin/components/AdminDocumentReviewList';
import { PageNav } from '@/components/PageNav';

export default function AdminDocumentReviewListPage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] px-2 py-6 sm:px-4">
      <div className="mx-auto mb-5 flex max-w-[1180px] gap-3">
        <PageNav />
      </div>

      <AdminDocumentReviewList />
    </div>
  );
}
