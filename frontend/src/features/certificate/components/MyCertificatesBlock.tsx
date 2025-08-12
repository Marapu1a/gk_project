// src/features/certificate/features/MyCertificatesBlock.tsx
import { useMemo, useState } from 'react';
import { useMyCertificates } from '../hooks/useMyCertificates';

export function MyCertificatesBlock() {
  const { data, isLoading, error } = useMyCertificates(true);
  const backendUrl = import.meta.env.VITE_API_URL;
  const [showHistory, setShowHistory] = useState(false);

  const certs = data ?? [];
  const active = useMemo(() => {
    if (!certs.length) return null;
    return certs.find((c) => c.isActiveNow) ?? certs[0];
  }, [certs]);

  const history = useMemo(
    () => (active ? certs.filter((c) => c.id !== active.id) : []),
    [certs, active],
  );

  if (isLoading) return <p className="text-sm text-blue-dark">Загрузка…</p>;
  if (error) return <p className="text-error">Ошибка загрузки сертификатов</p>;
  if (!active)
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        У вас пока нет выданных сертификатов.
      </div>
    );

  const link = `${backendUrl}/uploads/${active.file.fileId}`;

  const StatusPill = ({ active }: { active: boolean }) => (
    <span
      className="text-xs px-2 py-0.5 rounded-full text-white"
      style={{
        background: active ? 'var(--color-green-brand)' : 'var(--color-blue-dark)',
      }}
    >
      {active ? 'Активный' : 'Истёк'}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Текущий сертификат */}
      <div
        className="rounded-2xl border header-shadow bg-white overflow-hidden"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <h3 className="text-lg font-semibold text-blue-dark">Мой сертификат</h3>
          <StatusPill active={!!active.isActiveNow} />
        </div>

        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Название:</span> {active.title}
          </div>
          <div>
            <span className="text-gray-500">Номер:</span> {active.number}
          </div>
          <div>
            <span className="text-gray-500">Группа:</span> {active.group.name}
          </div>
          <div>
            <span className="text-gray-500">Выдан:</span>{' '}
            {new Date(active.issuedAt).toLocaleDateString('ru-RU')}
          </div>
          <div className={active.isExpired ? 'text-red-600' : ''}>
            <span className="text-gray-500">Действует до:</span>{' '}
            {new Date(active.expiresAt).toLocaleDateString('ru-RU')}
          </div>
        </div>

        <div className="px-6 pb-5">
          <a href={link} target="_blank" rel="noreferrer" className="text-brand underline text-sm">
            Открыть файл
          </a>
        </div>
      </div>

      {/* История */}
      {history.length > 0 && (
        <div
          className="rounded-2xl border header-shadow bg-white overflow-hidden"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <h4 className="text-blue-dark font-semibold">История сертификатов</h4>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="text-sm text-brand underline"
            >
              {showHistory ? 'Скрыть' : `Показать (${history.length})`}
            </button>
          </div>

          {showHistory && (
            <ul className="px-6 py-3 divide-y" style={{ borderColor: 'var(--color-green-light)' }}>
              {history.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">
                      {c.title} — №{c.number}
                    </div>
                    <div className="text-gray-500">
                      {c.group.name} · выдан {new Date(c.issuedAt).toLocaleDateString('ru-RU')} · до{' '}
                      {new Date(c.expiresAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <a
                    href={`${backendUrl}/uploads/${c.file.fileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand underline"
                  >
                    Файл
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
