// src/features/admin/components/ActiveCertificateBlock.tsx
const backendUrl = import.meta.env.VITE_API_URL;

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
  // активен, если не отозван (полей revoke нет) и не истёк
  if (!cert.expiresAt) return true; // бессрочный
  const exp = new Date(cert.expiresAt);
  return exp.getTime() >= Date.now();
}

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleDateString() : '—';
}

export default function ActiveCertificateBlock({
  certificates = [],
}: {
  certificates?: Cert[] | undefined;
}) {
  const active = (certificates || []).filter(isActive).sort((a, b) => {
    const ai = new Date(a.issuedAt || 0).getTime();
    const bi = new Date(b.issuedAt || 0).getTime();
    return bi - ai; // свежий первым
  })[0];

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-blue-dark">Активный сертификат</h2>

      {!active ? (
        <div className="text-sm text-gray-600">Активных сертификатов нет.</div>
      ) : (
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">
                {(active.title || 'Сертификат') + (active.number ? ` №${active.number}` : '')}
                {active.group?.name ? ` · ${active.group.name}` : ''}
              </div>
              <div className="text-sm text-gray-600">
                Выдан: {fmt(active.issuedAt)} · Действует до:{' '}
                {active.expiresAt ? fmt(active.expiresAt) : 'бессрочно'}
              </div>
              {active.confirmedBy && (
                <div className="text-xs text-gray-500">
                  Подтвердил: {active.confirmedBy.fullName || active.confirmedBy.email}
                </div>
              )}
              {active.comment && (
                <div className="text-xs text-gray-600 mt-1">Комментарий: {active.comment}</div>
              )}
            </div>

            {active.file && (
              <a
                href={`${backendUrl}/uploads/${active.file.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand"
              >
                Открыть файл
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
