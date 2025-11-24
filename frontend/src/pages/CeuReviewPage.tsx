// src/features/ceu/pages/CeuReviewPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useCEURecordsByEmail } from '@/features/ceu/hooks/useCeuRecordsByEmail';
import { CeuReviewForm } from '@/features/ceu/components/CeuReviewForm';
import { ceuReviewSearchSchema } from '@/features/ceu/validation/ceuReviewSearchSchema';
import { Button } from '@/components/Button';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BackButton } from '@/components/BackButton';
import { DashboardButton } from '@/components/DashboardButton';
import { useUsers } from '@/features/admin/hooks/useUsers';

type UserLite = { id: string; fullName: string; email: string };

// нормализуем под сравнение (как в AdminIssueCertificateForm / UsersTable)
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

export default function CeuReviewPage() {
  // Поле поиска по email (как раньше)
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Фильтры по датам
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const fromDateString = fromDate ? fromDate.toISOString().split('T')[0] : '';
  const toDateString = toDate ? toDate.toISOString().split('T')[0] : '';

  // Поиск по имени/email как в AdminIssueCertificateForm
  const [userSearchInput, setUserSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // дергаем сервер с дебаунсом
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(userSearchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [userSearchInput]);

  const { data: usersData, isLoading: isUsersLoading } = useUsers({ search, page: 1, perPage: 20 });
  const allUsers = usersData?.users ?? [];

  // локальный матч по ФИО/email/группам
  const matchedUsers = useMemo(() => {
    const tokens = tokenize(userSearchInput);
    if (tokens.length === 0) return [];

    return allUsers.filter((u: any) => {
      const hayParts = [
        u.fullName,
        u.email,
        ...((u.groups as { name: string }[] | undefined)?.map((g) => g.name) ?? []),
      ];
      const hay = norm(hayParts.filter(Boolean).join(' '));
      return tokens.every((t) => hay.includes(t));
    });
  }, [allUsers, userSearchInput]);

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

  // выбор пользователя из подсказок
  const pickUser = (u: UserLite) => {
    setEmail(u.email);
    setSubmittedEmail(u.email); // сразу тянем CEU
    setUserSearchInput(u.email); // в инпуте оставляем email
    setShowSuggestions(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Инспекция CEU-баллов</h1>

      <p className="text-sm text-gray-600">
        Введите email ученика или найдите пользователя по имени. Для точности можно указать даты.
      </p>

      {/* Верхняя панель кнопок */}
      <div className="flex gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      {/* Поиск по имени/email с подсказками (как в AdminIssueCertificateForm) */}
      <div
        className="rounded-2xl border header-shadow bg-white p-4"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div className="relative">
          <label className="block mb-1 text-blue-dark text-sm">Найти по имени или email</label>
          <input
            type="text"
            value={userSearchInput}
            onChange={(e) => {
              const v = e.target.value;
              setUserSearchInput(v);
              setEmail(v); // инспектор всё ещё может вбить email руками
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (userSearchInput.trim()) setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Начните вводить ФИО или email…"
            className="input w-80"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            autoComplete="off"
          />

          {showSuggestions && userSearchInput.trim() && matchedUsers.length > 0 && (
            <div
              className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-2xl bg-white header-shadow"
              style={{ border: '1px solid var(--color-green-light)' }}
            >
              {matchedUsers.map((u: any) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-green-light)' }}
                  onClick={() => pickUser(u)}
                >
                  <div className="font-medium">{u.fullName || 'Без имени'}</div>
                  <div className="text-xs text-gray-600">{u.email}</div>
                  {u.groups && u.groups.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Группы: {u.groups.map((g: any) => g.name).join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {showSuggestions &&
            userSearchInput.trim() &&
            !isUsersLoading &&
            matchedUsers.length === 0 && (
              <div
                className="absolute z-20 mt-1 w-full rounded-2xl bg-white header-shadow px-3 py-2 text-xs text-gray-600"
                style={{ border: '1px solid var(--color-green-light)' }}
              >
                Пользователь не найден. Можно ввести email вручную.
              </div>
            )}
        </div>
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

      {/* Нижняя панель кнопок */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <BackButton />
        <DashboardButton />
      </div>
    </div>
  );
}
