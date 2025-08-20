// src/features/ceu/components/CeuReviewContainer.tsx
import { useState } from 'react';
import { UserLookup } from './UserLookup';
import { useCEURecordsByEmail } from '../hooks/useCeuRecordsByEmail';
import { CeuReviewForm } from './CeuReviewForm';

type UserLite = { id: string; fullName: string; email: string };

export function CeuReviewContainer() {
  const [selected, setSelected] = useState<UserLite | null>(null);
  const email = selected?.email ?? '';
  const { data, isLoading, error } = useCEURecordsByEmail(email, !!email);

  return (
    <div className="space-y-6">
      <UserLookup onSelect={setSelected} />

      {!selected && (
        <p className="text-sm text-blue-dark">Выберите пользователя для проверки CEU.</p>
      )}

      {selected && isLoading && (
        <p className="text-sm text-blue-dark">Загружаю CEU для {selected.email}…</p>
      )}

      {selected && error && (
        <p className="text-error">Не удалось загрузить CEU записи пользователя.</p>
      )}

      {selected && data && <CeuReviewForm data={data} />}
    </div>
  );
}
