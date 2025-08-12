// src/features/user/components/BioEditModal.tsx
import { useState } from 'react';
import { useSetBio } from '@/features/user/hooks/useSetBio';

type Props = { userId: string; initial?: string | null; onClose: () => void };

export function BioEditModal({ userId, initial, onClose }: Props) {
  const [text, setText] = useState(initial ?? '');
  const mutation = useSetBio(userId);
  const left = 500 - text.length;

  const save = async () => {
    await mutation.mutateAsync(text.trim() ? text.trim() : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl p-6 w-full max-w-lg header-shadow"
        style={{ border: '1px solid var(--color-green-light)' }}
      >
        <h3 className="text-xl font-semibold text-blue-dark mb-4">О себе</h3>

        <textarea
          className="input h-40"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Коротко о себе (до 500 символов)…"
        />

        <div className="mt-2 text-xs text-gray-500 text-right">{left} / 500</div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </button>
          <button className="btn btn-accent" onClick={save} disabled={mutation.isPending}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
