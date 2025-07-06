import { useDeleteFile } from '../hooks/useDeleteFile';

const backendUrl = import.meta.env.VITE_API_URL;

type DetailBlockProps = {
  title: string;
  items: { id: string; name: string; fileId?: string }[];
};

export function DetailBlock({ title, items }: DetailBlockProps) {
  const isFilesBlock = title === 'Загруженные файлы';
  const deleteFile = useDeleteFile();

  const handleDelete = (fileId: string) => {
    if (confirm('Удалить файл безвозвратно?')) {
      deleteFile.mutate(fileId);
    }
  };

  return (
    <div className="bg-gray-50 rounded-md p-4 space-y-2">
      <h3 className="text-lg font-semibold text-blue-dark">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Нет данных</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              {isFilesBlock && item.fileId ? (
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
                    onClick={() => handleDelete(item.id)}
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
      )}
    </div>
  );
}
