import { useState } from 'react';
import { documentTypeLabels } from '../utils/documentTypeLabels';
import type { DocumentType } from '../utils/documentTypeLabels';
import { BackButton } from '@/components/BackButton';

type Props = {
  file: {
    id: string;
    name: string;
    preview?: string;
  };
  onConfirm: (details: { fileId: string; type: DocumentType; comment?: string }) => void;
};

export function DocumentFileDetailsForm({ file, onConfirm }: Props) {
  const [type, setType] = useState<DocumentType>('HIGHER_EDUCATION');
  const [comment, setComment] = useState<string>('');

  const handleConfirm = () => {
    if (!type) {
      alert('Выберите тип документа');
      return;
    }

    onConfirm({ fileId: file.id, type, comment: comment.trim() || undefined });

    // Сброс после подтверждения
    setType('HIGHER_EDUCATION');
    setComment('');
  };

  return (
    <div className="border border-green-light rounded p-4 space-y-3">
      <div className="flex items-center gap-4">
        {file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="w-20 h-20 object-cover rounded border"
          />
        ) : (
          <span className="text-xs">{file.name}</span>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-blue-dark mb-1">Тип документа</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="input"
        >
          {Object.entries(documentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-blue-dark mb-1">
          Комментарий (необязательно)
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input"
        />
      </div>

      <button type="button" onClick={handleConfirm} className="btn btn-brand w-full">
        Подтвердить
      </button>
      <BackButton />
    </div>
  );
}
