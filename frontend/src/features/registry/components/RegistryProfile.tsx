// src/features/registry/features/RegistryProfile.tsx
import { useState } from 'react';
import { useRegistryProfile } from '../hooks/useRegistryProfile';

type Props = { userId: string };

export function RegistryProfile({ userId }: Props) {
  const { data: p, isLoading, error } = useRegistryProfile(userId);
  const [open, setOpen] = useState(false);

  if (isLoading) return <div>Загрузка…</div>;
  if (error || !p) return <div>Профиль не найден</div>;

  const cert = p.certificate;
  const certUrl = cert ? `/uploads/${cert.fileId}` : '';
  const isPdf = /\.pdf($|\?)/i.test(certUrl);
  const avatarPlaceholder = '/avatar_placeholder.svg';

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

  return (
    <div
      className="rounded-2xl border bg-white p-6 space-y-6 header-shadow"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Заголовок */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-blue-dark break-words">{p.fullName}</h1>

        {p.groupName && (
          <div className="mt-1">
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs"
              style={{ color: 'var(--color-white)', background: badgeColor(p.groupName) }}
            >
              {p.groupName}
            </span>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-2">
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

      <h2 className="text-xl font-semibold text-blue-dark">Сертификат</h2>

      {/* Основная область: слева аватар, справа сертификат */}
      <div className="grid gap-6 md:grid-cols-[minmax(220px,280px)_1fr] items-stretch">
        {/* Левая колонка — аватар */}
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
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_520px] items-stretch">
              {/* Информация о сертификате */}
              <div>
                <dl className="text-base leading-6 space-y-4">
                  <div>
                    <dt className="text-gray-500">Название</dt>
                    <dd className="font-medium text-blue-dark break-words">{cert.title}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Номер</dt>
                    <dd className="font-medium break-words">№ {cert.number}</dd>
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

              {/* Превью сертификата — A4 без скроллов */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl p-3 bg-white hover:bg-gray-50 flex flex-col justify-between md:pl-6"
                style={{ borderLeft: '1px solid var(--color-green-light)' }}
                aria-label="Открыть сертификат"
              >
                <div className="relative w-full flex-1 min-h-[260px] rounded-lg overflow-hidden">
                  <div
                    className="w-full"
                    style={{ aspectRatio: '1.414 / 1', position: 'relative' }}
                  >
                    {isPdf ? (
                      // Плоский превью-бокс для PDF, без встроенного вьювера и без полос
                      <div className="absolute inset-0 grid place-items-center bg-white">
                        <div className="text-center text-blue-dark text-sm">
                          PDF-сертификат
                          <br />
                          <span className="text-gray-500">Нажмите, чтобы открыть</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={certUrl}
                        alt="certificate"
                        className="absolute inset-0 w-full h-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-dark text-center">
                  Открыть в полном размере
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка A4 (ландшафт) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl p-4 w-[min(95vw,1123px)] header-shadow">
            <div className="relative mx-auto" style={{ width: '100%', aspectRatio: '1.414 / 1' }}>
              {isPdf ? (
                <object
                  data={certUrl}
                  type="application/pdf"
                  className="absolute inset-0 w-full h-full"
                >
                  <a href={certUrl} target="_blank" rel="noreferrer" className="underline">
                    Открыть PDF в новой вкладке
                  </a>
                </object>
              ) : (
                <img
                  src={certUrl}
                  alt="certificate-full"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
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

function badgeColor(groupName: string) {
  switch (groupName.toLowerCase()) {
    case 'инструктор':
      return '#a16207'; // янтарный
    case 'куратор':
      return '#6d28d9'; // фиолетовый
    case 'супервизор':
      return '#1f355e'; // тёмно-синий
    case 'опытный супервизор':
      return '#0f766e'; // тил
    default:
      return 'var(--color-blue-dark)';
  }
}
