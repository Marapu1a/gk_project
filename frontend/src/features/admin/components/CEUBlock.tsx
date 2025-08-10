import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';

type Props = {
  ceuRecords: {
    id: string;
    eventName: string;
    eventDate: string;
    fileId: string | null;
    entries: {
      id: string;
      category: string;
      value: number;
      status: string;
      reviewedAt: string | null;
      rejectedReason: string | null;
      reviewer: {
        email: string;
        fullName: string;
      } | null;
    }[];
  }[];
};

export default function CEUBlock({ ceuRecords }: Props) {
  if (ceuRecords.length === 0) return null;

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">CEU-заявки</h2>

      {ceuRecords.map((rec) => (
        <div key={rec.id} className=" space-y-2 bg-gray-50">
          <div className="font-medium">
            {rec.eventName} — {formatDate(rec.eventDate)}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 px-3">Категория</th>
                <th className="py-1 px-3">Баллы</th>
                <th className="py-1 px-3">Статус</th>
                <th className="py-1 px-3">Проверено</th>
                <th className="py-1 px-3">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {rec.entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="py-1 px-3">
                    {ceuCategoryLabels[entry.category] || entry.category}
                  </td>
                  <td className="py-1 px-3">{entry.value}</td>
                  <td className="py-1 px-3">{recordStatusLabels[entry.status] || entry.status}</td>
                  <td className="py-1 px-3">
                    {entry.reviewedAt
                      ? `${new Date(entry.reviewedAt).toLocaleDateString()} ${
                          entry.reviewer?.fullName || ''
                        }`
                      : '—'}
                  </td>
                  <td className="py-1 px-3">{entry.rejectedReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
