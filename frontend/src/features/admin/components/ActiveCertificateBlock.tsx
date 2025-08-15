// src/features/admin/components/ActiveCertificateBlock.tsx

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

export default function ActiveCertificateBlock({ certificates = [] }: { certificates?: Cert[] }) {
  const active =
    [...(certificates || [])]
      .filter(isActive)
      .sort(
        (a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime(),
      )[0] || null;

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
          {active.file && (
            <div className="mt-4">
              <a
                href={`/uploads/${active.file.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand"
              >
                Открыть файл
              </a>
            </div>
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
