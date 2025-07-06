import { useState } from 'react';
import { useCEURecordsByEmail } from '@/features/ceu/hooks/useCeuRecordsByEmail';
import { CeuReviewForm } from '@/features/ceu/components/CeuReviewForm';
import { ceuReviewSearchSchema } from '@/features/ceu/validation/ceuReviewSearchSchema';
import { Button } from '@/components/Button';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BackButton } from '@/components/BackButton';

export default function CeuReviewPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fromDateString = fromDate ? fromDate.toISOString().split('T')[0] : '';
  const toDateString = toDate ? toDate.toISOString().split('T')[0] : '';

  const { data, isLoading, error } = useCEURecordsByEmail(
    submittedEmail,
    !!submittedEmail,
    fromDateString,
    toDateString,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fromDateString = fromDate ? fromDate.toISOString().split('T')[0] : '';
    const toDateString = toDate ? toDate.toISOString().split('T')[0] : '';

    const validation = ceuReviewSearchSchema.safeParse({
      email: email.trim(),
      fromDate: fromDateString,
      toDate: toDateString,
    });

    if (!validation.success) {
      alert(validation.error.errors[0].message);
      return;
    }

    setSubmittedEmail(email.trim());
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Инспекция CEU-баллов</h1>

      <p className="text-sm text-gray-600">
        Введите email ученика для поиска его CEU-заявок. Для более точного фильтра можете выбрать
        даты.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block mb-1">Email ученика</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-80"
          />
        </div>

        <div>
          <label className="block mb-1">От</label>
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Выберите дату"
            className="input"
          />
        </div>

        <div>
          <label className="block mb-1">До</label>
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Выберите дату"
            className="input"
          />
        </div>

        <Button type="submit" className="h-[42px]">
          Поиск
        </Button>
      </form>

      {isLoading && <p>Загрузка данных...</p>}
      {error && <p className="text-error">Ошибка загрузки</p>}
      {data && <CeuReviewForm data={data} />}

      <BackButton />
    </div>
  );
}
