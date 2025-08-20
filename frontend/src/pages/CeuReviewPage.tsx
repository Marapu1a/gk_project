// src/features/ceu/pages/CeuReviewPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useCEURecordsByEmail } from '@/features/ceu/hooks/useCeuRecordsByEmail';
import { CeuReviewForm } from '@/features/ceu/components/CeuReviewForm';
import { ceuReviewSearchSchema } from '@/features/ceu/validation/ceuReviewSearchSchema';
import { Button } from '@/components/Button'; // оставляю как у тебя
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BackButton } from '@/components/BackButton';
import { useUsers } from '@/features/admin/hooks/useUsers';

type UserLite = { id: string; fullName: string; email: string };

export default function CeuReviewPage() {
  // Поле поиска по email (как раньше)
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Фильтры по датам
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const fromDateString = fromDate ? fromDate.toISOString().split('T')[0] : '';
  const toDateString = toDate ? toDate.toISOString().split('T')[0] : '';

  // Поиск по имени/email (подсказки)
  const [nameQuery, setNameQuery] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data: usersData, isLoading: usersLoading } = useUsers({ search: nameSearch });
  const suggestions: UserLite[] = (usersData?.users ?? []).slice(0, 20);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Закрываем список, если поле очищено
  useEffect(() => {
    if (!nameQuery.trim()) setOpen(false);
  }, [nameQuery]);

  // Закрываем по клику вне
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Загрузка CEU по email
  const { data, isLoading, error } = useCEURecordsByEmail(
    submittedEmail,
    !!submittedEmail,
    fromDateString,
    toDateString,
  );

  // Сабмит формы «email + даты»
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      email: email.trim(),
      fromDate: fromDate ? fromDate.toISOString().split('T')[0] : '',
      toDate: toDate ? toDate.toISOString().split('T')[0] : '',
    };

    const validation = ceuReviewSearchSchema.safeParse(payload);
    if (!validation.success) {
      alert(validation.error.errors[0].message);
      return;
    }

    setSubmittedEmail(payload.email);
  };

  // Поиск по имени/email (только по кнопке)
  const handleNameSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = nameQuery.trim();
    setNameSearch(q);
    setOpen(!!q);
  };

  // Выбор пользователя из подсказок — подставляем email
  const pickUser = (u: UserLite) => {
    setEmail(u.email);
    setSubmittedEmail(u.email); // сразу тянем CEU; убери эту строку, если хочешь поиск только по кнопке
    setNameQuery('');
    setNameSearch('');
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Инспекция CEU-баллов</h1>

      <p className="text-sm text-gray-600">
        Введите email ученика или найдите пользователя по имени. Для точности можно указать даты.
      </p>

      {/* Поиск по имени/email с подсказками */}
      <div
        ref={dropdownRef}
        className="rounded-2xl border header-shadow bg-white p-4"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <form onSubmit={handleNameSearch} className="flex items-end gap-2">
          <div>
            <label className="block mb-1 text-blue-dark text-sm">Найти по имени или email</label>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Например: Иванов"
              className="input w-80"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>
          <Button type="submit" className="h-[42px]" disabled={usersLoading}>
            Поиск
          </Button>
        </form>

        {open && nameSearch && !usersLoading && suggestions.length > 0 && (
          <div
            className="mt-3 max-h-72 overflow-auto rounded-xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <ul className="divide-y" style={{ borderColor: 'var(--color-green-light)' }}>
              {suggestions.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-3 py-2">
                  <div className="truncate">
                    <div className="font-medium text-blue-dark truncate">{u.fullName || '—'}</div>
                    <div className="text-sm text-gray-500 truncate">{u.email}</div>
                  </div>
                  <Button variant="accent" size="sm" onClick={() => pickUser(u)}>
                    Выбрать
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {nameSearch && !usersLoading && suggestions.length === 0 && (
          <p className="text-sm text-blue-dark mt-3">Ничего не найдено по «{nameSearch}».</p>
        )}
      </div>

      {/* Исходная форма по email и датам */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block mb-1">Email ученика</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-80"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block mb-1">От</label>
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Дата мероприятия"
            className="input"
          />
        </div>

        <div>
          <label className="block mb-1">До</label>
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Дата мероприятия"
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
