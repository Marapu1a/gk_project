import { useEffect, useMemo, useState } from 'react';
import { useDeleteFile } from '../hooks/useDeleteFile';
import { toast } from 'sonner';

type Item = {
  id: string; // id UploadedFile
  name: string;
  fileId?: string;
  type?: string | null; // если приходит UploadedFile.type
};

type DetailBlockProps = {
  title: string;
  items: Item[];
  userId: string;
};

export default function DetailBlock({ title, items, userId }: DetailBlockProps) {
  const isFilesBlock = title === 'Загруженные файлы';
  const deleteFile = useDeleteFile(userId);

  // локальное состояние для мгновенного обновления UI
  const [localItems, setLocalItems] = useState<Item[]>(items);
  useEffect(() => setLocalItems(items), [items]);

  const getCategory = (fileId?: string) => {
    if (!fileId) return 'MISC';
    const parts = String(fileId).split('/');
    const raw = parts.length >= 2 ? parts[1] : 'misc';
    return (raw || 'misc').toUpperCase();
  };

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

    // файлы сертификатов трогаем только через спец-экран сертификатов
    if (isCert) {
      toast.error('Нельзя удалять файлы сертификатов. Замените/отзовите сертификат.');
      return;
    }

    const ok = await confirm('Удалить файл безвозвратно?');
    if (!ok) return;

    try {
      await deleteFile.mutateAsync(uploadedFileId);
      setLocalItems((prev) => prev.filter((it) => it.id !== uploadedFileId));
      toast.success('Файл удалён');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось удалить файл');
    }
  };

  const grouped = useMemo(() => {
    if (!isFilesBlock) return null;
    return localItems.reduce<Record<string, Item[]>>((acc, it) => {
      const key = getCategory(it.fileId);
      (acc[key] ||= []).push(it);
      return acc;
    }, {});
  }, [isFilesBlock, localItems]);

  return (
    <div
      className="rounded-2xl border bg-white p-4 space-y-3 header-shadow"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <h3 className="text-lg font-semibold text-blue-dark">{title}</h3>

      {!localItems || localItems.length === 0 ? (
        <p className="text-sm text-blue-dark">Нет данных</p>
      ) : !isFilesBlock ? (
        <ul className="space-y-1">
          {localItems.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <span className="truncate">{item.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped!).map(([category, list]) => (
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
                          href={`/uploads/${item.fileId}`}
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
          ))}
        </div>
      )}
    </div>
  );
}
