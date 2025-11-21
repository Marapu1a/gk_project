// src/features/admin/components/ActiveCertificateBlock.tsx
import { useEffect, useMemo, useState } from 'react';
import { EditCertificateModal } from './EditCertificateModal';

export type Cert = {
  id: string;
  number: string | null;
  title: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  isRenewal: boolean;
  comment: string | null;
  file: { fileId: string; name: string } | null;
  group: { id: string; name: string } | null;
  confirmedBy: { email: string; fullName: string } | null;
};

function isActive(cert: Cert) {
  if (!cert.expiresAt) return true;
  return new Date(cert.expiresAt).getTime() >= Date.now();
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

type Props = {
  userId: string;
  certificates?: Cert[];
};

export default function ActiveCertificateBlock({ certificates = [], userId }: Props) {
  const computedActive = useMemo(() => {
    return (
      [...(certificates || [])]
        .filter(isActive)
        .sort(
          (a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime(),
        )[0] || null
    );
  }, [certificates]);

  // ✅ локальное состояние для мгновенного UI-апдейта
  const [active, setActive] = useState<Cert | null>(computedActive);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // если снаружи пришли новые сертификаты – синхронизируем
  useEffect(() => {
    setActive(computedActive);
  }, [computedActive]);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-blue-dark">Активный сертификат</h2>

      {!active ? (
        <div className="text-sm text-blue-dark">Активных сертификатов нет.</div>
      ) : (
        <div
          className="rounded-2xl border p-4 bg-white header-shadow"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          {/* Шапка карточки */}
          <div
            className="rounded-xl px-3 py-2 flex items-center justify-between gap-3"
            style={{ background: 'var(--color-blue-soft)' }}
          >
            <div className="min-w-0">
              <div className="font-medium truncate text-blue-dark">
                {active.title || 'Сертификат'}
                {active.number ? ` №${active.number}` : ''}
                {active.group?.name ? ` · ${active.group.name}` : ''}
              </div>
            </div>

            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ color: 'var(--color-white)', background: 'var(--color-green-brand)' }}
            >
              Активный
            </span>
          </div>

          {/* Метаданные */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Meta label="Выдан" value={fmt(active.issuedAt)} />
            <Meta
              label="Действует до"
              value={active.expiresAt ? fmt(active.expiresAt) : 'бессрочно'}
            />
            {active.confirmedBy && (
              <Meta
                label="Подтвердил"
                value={active.confirmedBy.fullName || active.confirmedBy.email}
              />
            )}
            {active.comment && <Meta label="Комментарий" value={active.comment} />}
          </div>

          {/* Действия */}
          <div className="mt-4 flex flex-wrap gap-2">
            {active.file && (
              <a
                href={`/uploads/${active.file.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand"
              >
                Открыть файл
              </a>
            )}

            <button type="button" className="btn btn-ghost" onClick={() => setIsEditOpen(true)}>
              Редактировать
            </button>
          </div>

          {isEditOpen && (
            <EditCertificateModal
              userId={userId}
              certificate={{
                id: active.id,
                title: active.title,
                number: active.number,
                issuedAt: active.issuedAt,
                expiresAt: active.expiresAt,
                file: active.file,
              }}
              onClose={() => setIsEditOpen(false)}
              onUpdated={(updated) => {
                // ✅ моментально применяем изменения в UI
                setActive((prev) =>
                  prev
                    ? {
                        ...prev,
                        title: updated.title,
                        number: updated.number,
                        issuedAt: updated.issuedAt,
                        expiresAt: updated.expiresAt,
                        file: updated.file ?? prev.file,
                      }
                    : prev,
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-blue-dark">{label}:</div>
      <div>{value}</div>
    </div>
  );
}
