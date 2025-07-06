import { AdminDocumentReviewList } from '@/features/documentReviewAdmin/components/AdminDocumentReviewList';
import { BackButton } from '@/components/BackButton';

export default function AdminDocumentReviewListPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminDocumentReviewList />
      <BackButton />
    </div>
  );
}
