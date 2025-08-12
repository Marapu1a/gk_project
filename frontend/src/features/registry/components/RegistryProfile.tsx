// src/features/registry/features/RegistryProfile.tsx
import { useState } from 'react';
import { useRegistryProfile } from '../hooks/useRegistryProfile';

type Props = { userId: string };

const backendUrl = import.meta.env.VITE_API_URL;

export function RegistryProfile({ userId }: Props) {
  const { data: p, isLoading, error } = useRegistryProfile(userId);
  const [open, setOpen] = useState(false);

  if (isLoading) return <div>Загрузка…</div>;
  if (error || !p) return <div>Профиль не найден</div>;

  const cert = p.certificate;
  const certUrl = cert ? `${backendUrl}/uploads/${cert.fileId}` : '';
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');

  function since(d: string) {
    const now = new Date();
    const start = new Date(d);
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${decl(years, ['год', 'года', 'лет'])}`);
    if (months > 0) parts.push(`${months} ${decl(months, ['месяц', 'месяца', 'месяцев'])}`);
    if (!parts.length) parts.push('меньше месяца');
    return parts.join(' ');
  }
  function decl(n: number, forms: [string, string, string]) {
    const n10 = n % 10,
      n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
    return forms[2];
  }

  const avatarPlaceholder = '/avatar_placeholder.svg';

  return (
    <div
      className="rounded-2xl border bg-white p-6 space-y-6 header-shadow"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Заголовок (без аватара) */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-blue-dark">{p.fullName}</h1>
        <div className="text-sm text-gray-600">
          {[p.country, p.city].filter(Boolean).join(', ') || '—'}
        </div>
        <div className="text-xs text-gray-500">
          Регистрация: {fmt(p.createdAt)} · {since(p.createdAt)} назад
        </div>
      </div>

      {/* О себе */}
      {p.bio && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-blue-soft)' }}>
          <div className="text-sm font-semibold text-blue-dark mb-2">О себе</div>
          <div className="text-sm text-blue-dark whitespace-pre-wrap">{p.bio}</div>
        </div>
      )}

      {/* Основная область: слева крупный аватар, справа сертификат */}
      <div className="grid gap-6 md:grid-cols-[minmax(220px,280px)_1fr] items-stretch">
        {/* Левая колонка — аватар на всю высоту */}
        <div className="hidden md:block">
          <div className="h-full">
            <div
              className="relative w-full h-full min-h-[360px] rounded-2xl bg-white overflow-hidden"
              style={{ border: '1px solid var(--color-green-light)' }}
            >
              <img
                src={p.avatarUrl || avatarPlaceholder}
                alt={p.fullName}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src.endsWith('avatar_placeholder.svg')) return;
                  el.src = avatarPlaceholder;
                }}
              />
            </div>
          </div>
        </div>

        {/* Правая колонка — сертификат */}
        {cert && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-blue-dark">Сертификат</h2>

            <div
              className="rounded-2xl p-5 bg-white"
              style={{ border: '1px solid var(--color-green-light)' }}
            >
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] items-stretch">
                {/* Информация о сертификате */}
                <div>
                  <dl className="text-base leading-6 space-y-4">
                    <div>
                      <dt className="text-gray-500">Название</dt>
                      <dd className="font-medium text-blue-dark">{cert.title}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Номер</dt>
                      <dd className="font-medium">№ {cert.number}</dd>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-gray-500">Выдан</dt>
                        <dd className="font-medium">{fmt(cert.issuedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Действителен до</dt>
                        <dd className="font-medium">{fmt(cert.expiresAt)}</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Превью сертификата */}
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-xl p-3 bg-white hover:bg-gray-50 flex flex-col justify-between"
                  style={{ border: '1px solid var(--color-green-light)' }}
                  aria-label="Открыть сертификат"
                >
                  <div className="relative w-full flex-1 min-h-[240px] rounded-lg bg-white overflow-hidden">
                    <img
                      src={certUrl}
                      alt="certificate"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-3 text-xs text-blue-dark text-center">
                    Открыть в полном размере
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модалка A4 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl p-4 w-[min(90vw,900px)] header-shadow">
            <div
              className="relative mx-auto"
              style={{ width: '794px', maxWidth: '100%', aspectRatio: '1 / 1.414' }}
            >
              <img
                src={certUrl}
                alt="certificate-full"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn" onClick={() => setOpen(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
