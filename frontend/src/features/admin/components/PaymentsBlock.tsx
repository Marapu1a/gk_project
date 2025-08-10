import { paymentTypeLabels, paymentStatusLabels } from '@/utils/labels';

type Props = {
  payments: {
    id: string;
    type: string;
    status: string;
    comment: string | null;
    createdAt: string;
    confirmedAt: string | null;
  }[];
};

export default function PaymentsBlock({ payments }: Props) {
  if (payments.length === 0) return null;

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">Платежи</h2>

      <table className="w-full text-sm border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="py-1 px-3">Тип</th>
            <th className="py-1 px-3">Статус</th>
            <th className="py-1 px-3">Комментарий</th>
            <th className="py-1 px-3">Создан</th>
            <th className="py-1 px-3">Подтвержден</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-1 px-3">{paymentTypeLabels[p.type] || p.type}</td>
              <td className="py-1 px-3">{paymentStatusLabels[p.status] || p.status}</td>
              <td className="py-1 px-3">{p.comment || '—'}</td>
              <td className="py-1 px-3">{formatDate(p.createdAt)}</td>
              <td className="py-1 px-3">{formatDate(p.confirmedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
