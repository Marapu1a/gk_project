import { useDeleteFile } from '../hooks/useDeleteFile';

const backendUrl = import.meta.env.VITE_API_URL;

type Item = { id: string; name: string; fileId?: string };

type DetailBlockProps = {
  title: string;
  items: Item[];
  userId: string;
};

export default function DetailBlock({ title, items, userId }: DetailBlockProps) {
  const isFilesBlock = title === 'Загруженные файлы';
  const deleteFile = useDeleteFile(userId);

  const handleDelete = (uploadedFileId: string) => {
    if (confirm('Удалить файл безвозвратно?')) {
      deleteFile.mutate(uploadedFileId);
    }
  };

  // извлечь категорию из fileId: userId/<category>/fileName
  const getCategory = (fileId?: string) => {
    if (!fileId) return 'misc';
    const parts = fileId.split('/');
    return parts.length >= 2 ? parts[1] || 'misc' : 'misc';
  };

  // если это файлы — сгруппировать по категории
  const grouped: Record<string, Item[]> | null = isFilesBlock
    ? items.reduce<Record<string, Item[]>>((acc, it) => {
        const key = getCategory(it.fileId);
        (acc[key] ||= []).push(it);
        return acc;
      }, {})
    : null;

  return (
    <div className="bg-gray-50 rounded-md p-4 space-y-2">
      <h3 className="text-lg font-semibold text-blue-dark">{title}</h3>

      {!items || items.length === 0 ? (
        <p className="text-sm text-gray-600">Нет данных</p>
      ) : !isFilesBlock ? (
        // Обычный плоский список (не файлы)
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        // Файлы — по категориям
        <div className="space-y-3">
          {Object.entries(grouped!).map(([category, list]) => (
            <div key={category} className="space-y-1">
              <div className="text-sm font-medium text-gray-700">{category}</div>
              <ul className="space-y-1">
                {list.map((item) => (
                  <li key={item.id} className="flex justify-between items-center">
                    {item.fileId ? (
                      <>
                        <a
                          href={`${backendUrl}/uploads/${item.fileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand underline"
                        >
                          {item.name}
                        </a>
                        <button
                          onClick={() => handleDelete(item.id)} // удаляем по id записи
                          className="btn btn-reject text-xs py-1 px-2"
                          disabled={deleteFile.isPending}
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <span>{item.name}</span>
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
