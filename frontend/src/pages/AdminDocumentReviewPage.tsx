import { DocumentReviewTable } from '@/features/documentReview/components/DocumentReviewTable';

export default function AdminDocumentReviewPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Заявки на проверку документов</h1>
      <DocumentReviewTable />
    </div>
  );
}
