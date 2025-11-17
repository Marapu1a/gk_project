// src/features/certificate/features/AdminIssueCertificateForm.tsx
import { useEffect, useMemo, useState } from 'react';
import { useIssueCertificate } from '../hooks/useIssueCertificate';
import { Button } from '@/components/Button';
import { FileUpload } from '@/utils/FileUpload';
import { updateFile } from '@/features/files/api/updateFile';
import { toast } from 'sonner';
import { useUsers } from '@/features/admin/hooks/useUsers';

type Props = {
  defaultEmail?: string;
  onSuccess?: () => void;
};

// нормализуем под сравнение (как в UsersTable)
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

export function AdminIssueCertificateForm({ defaultEmail = '', onSuccess }: Props) {
  // это то, что реально уйдёт в мутацию (email пользователя)
  const [email, setEmail] = useState(defaultEmail);

  // это текст в инпуте, по нему ищем по ФИО/email/группам
  const [userSearchInput, setUserSearchInput] = useState(defaultEmail);
  const [search, setSearch] = useState(defaultEmail);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState(''); // yyyy-mm-dd
  const [expiresDate, setExpiresDate] = useState(''); // yyyy-mm-dd
  const [uploadedFileId, setUploadedFileId] = useState<string>('');
  const [resetKey, setResetKey] = useState(0); // чтобы сбрасывать FileUpload/превью

  const mutation = useIssueCertificate();

  // дергаем сервер с дебаунсом (как в UsersTable)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(userSearchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [userSearchInput]);

  const { data: usersData, isLoading: isUsersLoading } = useUsers({ search, page: 1, perPage: 20 });

  const allUsers = usersData?.users ?? [];

  // ⚡ Мгновенный фильтр по ФИО/email/группам
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

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  function toISOStartOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toISOString();
  }

  function toISOEndOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T23:59:59');
    return d.toISOString();
  }

  const canSubmit =
    !!email.trim() &&
    !!title.trim() &&
    !!number.trim() &&
    !!issuedDate &&
    !!expiresDate &&
    !!uploadedFileId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || mutation.isPending) return;

    if (!(await confirmToast('Выдать сертификат этому пользователю?'))) return;

    try {
      await mutation.mutateAsync({
        email: email.trim(),
        title: title.trim(),
        number: number.trim(),
        issuedAt: toISOStartOfDay(issuedDate),
        expiresAt: toISOEndOfDay(expiresDate),
        uploadedFileId,
      });

      toast.success('Сертификат выдан');

      // Сброс формы + скрываем превью (ремоунт FileUpload)
      setTitle('');
      setNumber('');
      setIssuedDate('');
      setExpiresDate('');
      setUploadedFileId('');
      setResetKey((k) => k + 1);

      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Не удалось выдать сертификат';
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {/* Поиск пользователя / выбор email */}
      <div className="relative">
        <label className="block text-sm font-medium text-blue-dark mb-1">Email пользователя</label>
        <input
          type="text"
          value={userSearchInput}
          onChange={(e) => {
            const v = e.target.value;
            setUserSearchInput(v);
            setEmail(v); // админ может вбить email руками
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (userSearchInput.trim()) setShowSuggestions(true);
          }}
          onBlur={() => {
            // даём клику по элементу списка успеть сработать
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          className="input"
          placeholder="Начните вводить ФИО или email…"
          autoComplete="off"
          required
        />

        {/* Дропдаун совпадений */}
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
                onClick={() => {
                  setEmail(u.email);
                  setUserSearchInput(u.email); // в инпуте оставляем email
                  setShowSuggestions(false);
                }}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">
            Название сертификата
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Напр. Инструктор"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">Номер</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="input"
            placeholder="Напр. 2025-001"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">Дата выдачи</label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">
            Действует до (дата)
          </label>
          <input
            type="date"
            value={expiresDate}
            onChange={(e) => setExpiresDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-blue-dark mb-1">Файл сертификата</label>
        <FileUpload
          resetKey={resetKey}
          category="CERTIFICATE"
          disabled={mutation.isPending}
          onChange={async (f) => {
            if (!f) {
              setUploadedFileId('');
              return;
            }
            try {
              await updateFile(f.id, 'CERTIFICATE');
            } catch {
              toast.info('Файл загружен, но не удалось обновить метаданные.');
            }
            setUploadedFileId(f.id);
          }}
        />
        {!uploadedFileId && (
          <p className="text-xs text-gray-500 mt-1">Загрузите PDF/изображение сертификата.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? 'Выдаю…' : 'Выдать сертификат'}
        </Button>
      </div>
    </form>
  );
}
