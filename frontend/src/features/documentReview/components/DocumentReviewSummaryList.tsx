type Props = {
  documents: {
    fileId: string;
    type: string;
    comment?: string;
    preview?: string;
  }[];
};

const typeLabels: Record<string, string> = {
  HIGHER_EDUCATION: 'Высшее образование',
  ADDITIONAL_EDUCATION: 'Доп. образование',
  OTHER: 'Другое',
};

export function DocumentReviewSummaryList({ documents }: Props) {
  if (documents.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-blue-dark">Добавленные документы</h3>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li
            key={doc.fileId}
            className="flex items-center gap-4 p-3 border border-green-light rounded bg-green-light/10"
          >
            {doc.preview && (
              <img
                src={doc.preview}
                alt={`${typeLabels[doc.type] || doc.type}${doc.comment ? ` – ${doc.comment}` : ''}`}
                className="w-16 h-16 object-cover rounded border"
              />
            )}

            <div className="flex-1">
              <p className="text-sm font-medium">{typeLabels[doc.type] || doc.type}</p>
              {doc.comment && <p className="text-xs text-gray-600">{doc.comment}</p>}
            </div>

            <span className="text-xs text-gray-400">ID: {doc.fileId}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
