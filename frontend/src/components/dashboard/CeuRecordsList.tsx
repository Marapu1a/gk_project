import { useMyCeu } from '@/hooks/useMyCeu';

type CeuRecord = {
  id: string;
  eventName: string;
  eventDate: string;
  ceu_ethics: number;
  ceu_cult_diver: number;
  ceu_superv: number;
  ceu_general: number;
  is_valid: boolean;
  spentOnCertificate: boolean;
};

type MyCeuResponse = {
  total: {
    ethics: number;
    cultDiver: number;
    supervision: number;
    general: number;
  };
  records: CeuRecord[];
};

export function CeuRecordsList() {
  const { data } = useMyCeu() as { data: MyCeuResponse | undefined };

  if (!data) return <p>Загрузка записей CEU...</p>;

  const { total, records } = data;

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Загруженные CEU-файлы</h2>

      <ul className="divide-y border rounded-md">
        {records.length === 0 && <li className="p-3 text-gray-500">Нет загруженных записей.</li>}

        {records.map((r: CeuRecord) => (
          <li key={r.id} className="p-3">
            <div className="font-medium">{r.eventName}</div>
            <div className="text-sm text-gray-600">
              {new Date(r.eventDate).toLocaleDateString()} —{' '}
              {r.is_valid ? (r.spentOnCertificate ? '✅ потрачено' : '✅ валидно') : '❌ невалидно'}
            </div>
            <div className="text-sm mt-1">
              Баллы: этика {r.ceu_ethics}, культура {r.ceu_cult_diver}, супервизия {r.ceu_superv},
              общее {r.ceu_general}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-sm text-gray-700">
        <strong>Всего баллов:</strong> этика {total.ethics}, культура {total.cultDiver}, супервизия{' '}
        {total.supervision}, общее {total.general}
      </div>
    </section>
  );
}
