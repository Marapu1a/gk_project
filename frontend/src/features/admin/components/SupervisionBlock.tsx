import { practiceLevelLabels, recordStatusLabels } from '@/utils/labels';

type Props = {
  supervisionRecords: {
    id: string;
    fileId: string | null;
    createdAt: string;
    hours: {
      id: string;
      type: string;
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

export default function SupervisionBlock({ supervisionRecords }: Props) {
  if (supervisionRecords.length === 0) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">Часы супервизии</h2>

      {supervisionRecords.map((rec) => (
        <div key={rec.id} className="   space-y-2 bg-gray-50">
          <div className="font-medium">
            Дата: {formatDate(rec.createdAt)}
            {rec.fileId && (
              <span className="ml-2 text-blue-600 underline cursor-pointer">[файл]</span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 px-3">Тип</th>
                <th className="py-1 px-3">Часы</th>
                <th className="py-1 px-3">Статус</th>
                <th className="py-1 px-3">Проверено</th>
                <th className="py-1 px-3">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {rec.hours.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="py-1 px-3">{practiceLevelLabels[h.type] || h.type}</td>
                  <td className="py-1 px-3">{h.value}</td>
                  <td className="py-1 px-3">{recordStatusLabels[h.status] || h.status}</td>
                  <td className="py-1 px-3">
                    {h.reviewedAt
                      ? `${formatDate(h.reviewedAt)} ${h.reviewer?.fullName || ''}`
                      : '—'}
                  </td>
                  <td className="py-1 px-3">{h.rejectedReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
