import { useDeleteFile } from '../hooks/useDeleteFile';
import { toast } from 'sonner';

const backendUrl = import.meta.env.VITE_API_URL;

type Item = {
  id: string;
  name: string;
  fileId?: string;
  type?: string | null; // если приходит UploadedFile.type
  certificate?: {
    title?: string | null;
    number?: string | null;
    issuedAt?: string | null; // ISO
    expiresAt?: string | null; // ISO
  };
};

type DetailBlockProps = {
  title: string;
  items: Item[];
  userId: string;
};

export default function DetailBlock({ title, items, userId }: DetailBlockProps) {
  const isFilesBlock = title === 'Загруженные файлы';
  const deleteFile = useDeleteFile(userId);

  const getCategory = (fileId?: string) => {
    if (!fileId) return 'MISC';
    const parts = String(fileId).split('/');
    const raw = parts.length >= 2 ? parts[1] : 'misc';
    return (raw || 'misc').toUpperCase();
  };

  const isCertificateItem = (category: string, it: Item) =>
    category === 'CERTIFICATE' ||
    String(it.type || '').toUpperCase() === 'CERTIFICATE' ||
    !!it.certificate;

  function splitByIssuedAt(certs: Item[]) {
    let activeIndex = -1;
    let best = -Infinity;
    certs.forEach((it, i) => {
      const t = it.certificate?.issuedAt ? Date.parse(it.certificate.issuedAt) : NaN;
      if (Number.isFinite(t) && t > best) {
        best = t;
        activeIndex = i;
      }
    });
    if (activeIndex === -1) return { active: null as Item | null, inactive: certs };
    const active = certs[activeIndex];
    const inactive = certs.filter((_, i) => i !== activeIndex);
    return { active, inactive };
  }

  async function confirm(message: string) {
    return await new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Удалить', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });
  }

  const handleDelete = async (uploadedFileId: string, category?: string, type?: string | null) => {
    const isCert =
      String(category || '').toUpperCase() === 'CERTIFICATE' ||
      String(type || '').toUpperCase() === 'CERTIFICATE';

    if (isCert) {
      toast.error('Нельзя удалять файлы сертификатов. Замените/отзовите сертификат.');
      return;
    }

    const ok = await confirm('Удалить файл безвозвратно?');
    if (!ok) return;

    try {
      await deleteFile.mutateAsync(uploadedFileId);
      toast.success('Файл удалён');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось удалить файл');
    }
  };

  const grouped: Record<string, Item[]> | null = isFilesBlock
    ? items.reduce<Record<string, Item[]>>((acc, it) => {
        const key = getCategory(it.fileId);
        (acc[key] ||= []).push(it);
        return acc;
      }, {})
    : null;

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  const renderCertItem = (it: Item) => {
    const meta = it.certificate;
    const title = meta?.title || it.name || 'Сертификат';
    const number = meta?.number || '';
    const issued = fmt(meta?.issuedAt);
    const expires = fmt(meta?.expiresAt);

    return (
      <li
        key={it.id}
        className="flex items-start justify-between gap-3 border rounded-xl px-3 py-2"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="font-medium text-blue-dark truncate">{title}</div>
          <div className="text-sm text-gray-700">
            {number ? (
              <div>
                <span className="text-gray-500">Номер:</span> № {number}
              </div>
            ) : null}
            <div>
              <span className="text-gray-500">Выдан:</span> {issued}
            </div>
            <div>
              <span className="text-gray-500">Действителен до:</span> {expires}
            </div>
          </div>
        </div>

        {it.fileId && (
          <a
            href={`${backendUrl}/uploads/${it.fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent text-xs py-1 px-2 whitespace-nowrap"
            title="Открыть сертификат"
          >
            Открыть
          </a>
        )}
      </li>
    );
  };

  return (
    <div
      className="rounded-2xl border bg-white p-4 space-y-3 header-shadow"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <h3 className="text-lg font-semibold text-blue-dark">{title}</h3>

      {!items || items.length === 0 ? (
        <p className="text-sm text-blue-dark">Нет данных</p>
      ) : !isFilesBlock ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <span className="truncate">{item.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped!).map(([category, list]) => {
            if (category === 'CERTIFICATE' || list.some((it) => isCertificateItem(category, it))) {
              const certs = list.filter((it) => isCertificateItem(category, it));
              const { active, inactive } = splitByIssuedAt(certs);

              return (
                <div key={category} className="space-y-2">
                  <div
                    className="text-sm font-medium rounded-xl px-3 py-1 inline-block text-blue-dark"
                    style={{ background: 'var(--color-blue-soft)' }}
                  >
                    CERTIFICATE
                  </div>

                  {active && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-dark">Активный сертификат</div>
                      <ul className="space-y-2">{[active].map(renderCertItem)}</ul>
                    </div>
                  )}

                  {inactive.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-dark">
                        Неактивные сертификаты
                      </div>
                      <ul className="space-y-2">{inactive.map(renderCertItem)}</ul>
                    </div>
                  )}
                </div>
              );
            }

            // Прочие категории
            return (
              <div key={category} className="space-y-2">
                <div
                  className="text-sm font-medium rounded-xl px-3 py-1 inline-block text-blue-dark"
                  style={{ background: 'var(--color-blue-soft)' }}
                >
                  {category}
                </div>

                <ul className="space-y-2">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border rounded-xl px-3 py-2"
                      style={{ borderColor: 'var(--color-green-light)' }}
                    >
                      {item.fileId ? (
                        <>
                          <a
                            href={`${backendUrl}/uploads/${item.fileId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand underline truncate"
                            title={item.name}
                          >
                            {item.name}
                          </a>
                          <button
                            onClick={() => handleDelete(item.id, category, item.type)}
                            className="btn btn-danger text-xs py-1 px-2"
                            disabled={deleteFile.isPending}
                            aria-label="Удалить файл"
                          >
                            Удалить
                          </button>
                        </>
                      ) : (
                        <span className="truncate">{item.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
