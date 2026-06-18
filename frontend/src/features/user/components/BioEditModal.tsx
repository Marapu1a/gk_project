// src/features/user/components/BioEditModal.tsx
import { useState } from 'react';
import { ModalCloseButton } from '@/components/ModalCloseButton';
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
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 header-shadow"
        style={{ border: '1px solid var(--color-green-light)' }}
      >
        <ModalCloseButton onClick={onClose} disabled={mutation.isPending} />

        <h3 className="mb-4 text-xl font-semibold text-blue-dark">О себе</h3>

        <textarea
          className="input h-40"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Коротко о себе (до 500 символов)…"
        />

        <div className="mt-2 text-right text-xs text-gray-500">{left} / 500</div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-accent" onClick={save} disabled={mutation.isPending}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
