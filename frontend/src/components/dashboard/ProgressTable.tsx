import { useCeuSummary } from '@/hooks/useCeuSummary';

export function ProgressTable() {
  const { data } = useCeuSummary();

  if (!data) return <p>Загрузка таблицы прогресса...</p>;

  const { required, usable, total, supervisionRequired, supervisionActual } = data;

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Прогресс сертификации</h2>

      <div className="w-full overflow-x-auto rounded border">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Категория</th>
              <th className="p-2">Факт / Норма</th>
              <th className="p-2 text-right">Всего</th>
            </tr>
          </thead>
          <tbody>
            {/* --- Супервизионные часы --- */}
            <tr className="border-t">
              <td className="p-2 font-medium">Инструкторская практика</td>
              <td className="p-2">
                {supervisionActual.instructor} / {supervisionRequired.instructor} ч.
              </td>
              <td className="p-2 text-right">—</td>
            </tr>
            <tr>
              <td className="p-2 font-medium">Кураторская практика</td>
              <td className="p-2">
                {supervisionActual.curator} / {supervisionRequired.curator} ч.
              </td>
              <td className="p-2 text-right">—</td>
            </tr>
            <tr>
              <td className="p-2 font-medium">Супервизорская практика</td>
              <td className="p-2">
                {supervisionActual.supervisor} / {supervisionRequired.supervisor} ч.
              </td>
              <td className="p-2 text-right">—</td>
            </tr>

            {/* --- CEU-баллы --- */}
            {required && (
              <>
                <tr className="border-t">
                  <td className="p-2 font-medium">Этика</td>
                  <td className="p-2">
                    {usable.ethics} / {required.ethics} баллов
                  </td>
                  <td className="p-2 text-right">{total.ethics}</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Культура</td>
                  <td className="p-2">
                    {usable.cultDiver} / {required.cultDiver} баллов
                  </td>
                  <td className="p-2 text-right">{total.cultDiver}</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Общие баллы</td>
                  <td className="p-2">
                    {usable.general} / {required.general} баллов
                  </td>
                  <td className="p-2 text-right">{total.general}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
