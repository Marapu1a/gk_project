// src/pages/CeuReviewPage.tsx
import { useState } from 'react';
import { useCEURecordsByEmail } from '@/features/ceu/hooks/useCeuRecordsByEmail';
import { CeuReviewForm } from '@/features/ceu/components/CeuReviewForm';

export default function CeuReviewPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { data, isLoading, error } = useCEURecordsByEmail(submittedEmail, !!submittedEmail);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Инспекция CEU-баллов</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedEmail(email.trim());
        }}
        className="flex gap-2 items-end"
      >
        <div>
          <label className="block mb-1">Email ученика</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-80"
          />
        </div>
        <button type="submit" className="btn btn-brand h-[42px]">
          Поиск
        </button>
      </form>

      {isLoading && <p>Загрузка данных...</p>}
      {error && <p className="text-error">Ошибка загрузки</p>}
      {data && <CeuReviewForm data={data} />}
    </div>
  );
}
