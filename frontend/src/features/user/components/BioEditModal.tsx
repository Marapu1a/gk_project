// src/features/user/components/BioEditModal.tsx
import { useState } from 'react';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
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
    <ModalShell
      onClose={onClose}
      ariaLabelledBy="bio-edit-title"
      overlayClassName="z-50 bg-black/40 px-4"
      dialogClassName="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-green-light)] bg-white p-6 header-shadow"
    >
      <ModalCloseButton onClick={onClose} disabled={mutation.isPending} />

      <h3 id="bio-edit-title" className="mb-4 text-xl font-semibold text-blue-dark">
        О себе
      </h3>

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
    </ModalShell>
  );
}
