// src/features/certificate/components/AdminIssueCertificateForm.tsx
import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useIssueCertificate } from '../hooks/useIssueCertificate';
import { updateFile } from '@/features/files/api/updateFile';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { toast } from 'sonner';
import { useUsers } from '@/features/admin/hooks/useUsers';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const MAX_CERTIFICATE_FILE_MB = 20;
const CERTIFICATE_NUMBER_PREFIX = 'РОСС RU.04ЦВА0.';
const normalizeCertificateNumberSuffix = (value: string) =>
  value.replace(/[^\d.]/g, '').slice(0, 8);

function resolveCertificateTitle(cycle?: {
  type: 'CERTIFICATION' | 'RENEWAL';
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
} | null) {
  if (!cycle) return '';
  if (cycle.targetLevel === 'INSTRUCTOR') return 'Инструктор ПАП';
  if (cycle.targetLevel === 'CURATOR') return 'Куратор ПАП';
  if (cycle.type === 'RENEWAL' && cycle.targetLevel === 'SUPERVISOR') {
    return 'Опытный супервизор ПАП';
  }
  return 'Супервизор ПАП';
}

// нормализуем под сравнение (как в UsersTable)
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

type Props = {
  defaultEmail?: string;
  onSuccess?: () => void;
};

type UploadedCertificateFile = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
};

export function AdminIssueCertificateForm({ defaultEmail = '', onSuccess }: Props) {
  const [email, setEmail] = useState(defaultEmail);

  const [userSearchInput, setUserSearchInput] = useState(defaultEmail);
  const [search, setSearch] = useState(defaultEmail);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [numberSuffix, setNumberSuffix] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiresDate, setExpiresDate] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<UploadedCertificateFile | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const mutation = useIssueCertificate();
  const { confirm } = useConfirm();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(userSearchInput.trim());
    }, 250);

    return () => clearTimeout(t);
  }, [userSearchInput]);

  const { data: usersData, isLoading: isUsersLoading } = useUsers({
    search,
    page: 1,
    perPage: 20,
  });

  const allUsers = usersData?.users ?? [];

  const exactMatchedUser = useMemo(() => {
    const input = norm(userSearchInput);
    if (!input) return null;

    return (
      allUsers.find((u: any) => {
        const values = [u.email, u.fullName].filter(Boolean).map(norm);
        return values.includes(input);
      }) ?? null
    );
  }, [allUsers, userSearchInput]);

  const hasResolvedUser = Boolean(selectedUserId || exactMatchedUser);
  const resolvedUserId = selectedUserId || exactMatchedUser?.id || null;
  const hasUnresolvedUserInput =
    Boolean(userSearchInput.trim()) && !isUsersLoading && !hasResolvedUser;

  const { data: certificateUserDetails } = useUserDetails(resolvedUserId ?? '');
  const certificateTitle = resolveCertificateTitle(certificateUserDetails?.activeCycle);

  useEffect(() => {
    setTitle(certificateTitle);
  }, [certificateTitle]);

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

  function toISOStartOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toISOString();
  }

  function toISOEndOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T23:59:59`);
    return d.toISOString();
  }

  const canSubmit =
    !!email.trim() &&
    !!title.trim() &&
    !!numberSuffix.trim() &&
    !!issuedDate &&
    !!expiresDate &&
    !!uploadedFileId;

  const isBusy = mutation.isPending || isUploadingFile;

  const mapError = (err: any) => {
    const code = err?.response?.data?.error;
    const message = err?.response?.data?.message;

    if (typeof message === 'string' && message.trim()) return message;
    if (code === 'NO_ACTIVE_CYCLE') return 'Нет активного цикла — выдача сертификата невозможна.';
    if (code === 'CYCLE_ALREADY_HAS_CERTIFICATE') {
      return 'На этот цикл уже выдан сертификат.';
    }
    if (code === 'CERTIFICATE_FILE_MUST_BE_PDF') {
      return 'Для сертификата можно загрузить только PDF-файл.';
    }
    if (code === 'TARGET_GROUP_NOT_CONFIGURED') return 'Целевая группа не настроена в системе.';
    return code || err?.message || 'Не удалось выдать сертификат';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isBusy) return;

    const ok = await confirm({
      message: 'Выдать сертификат этому пользователю?',
      confirmLabel: 'Выдать',
    });
    if (!ok) return;

    try {
      const res = await mutation.mutateAsync({
        email: email.trim(),
        title: title.trim(),
        number: `${CERTIFICATE_NUMBER_PREFIX}${numberSuffix.trim()}`,
        issuedAt: toISOStartOfDay(issuedDate),
        expiresAt: toISOEndOfDay(expiresDate),
        uploadedFileId,
      });

      const spent = typeof res.spentCeuCount === 'number' ? res.spentCeuCount : null;
      const resetPayments =
        typeof res.paymentsResetCount === 'number' ? res.paymentsResetCount : null;
      const renewalPaymentCreated =
        typeof res.renewalPaymentId === 'string' && !!res.renewalPaymentId;

      const detailsParts: string[] = [];
      if (spent !== null) detailsParts.push(`CEU списано: ${spent}`);
      if (resetPayments !== null) detailsParts.push(`оплаты сброшены: ${resetPayments}`);
      if (renewalPaymentCreated) detailsParts.push('флаг ресертификации создан');

      toast.success(
        detailsParts.length ? `Сертификат выдан. ${detailsParts.join(', ')}.` : 'Сертификат выдан',
      );

      setTitle('');
      setNumberSuffix('');
      setIssuedDate('');
      setExpiresDate('');
      setUploadedFileId('');
      setUploadedFile(null);

      onSuccess?.();
    } catch (err: any) {
      toast.error(mapError(err));
    }
  }

  const handlePdfDrop = async (accepted: File[]) => {
    const file = accepted[0];
    if (!file || isBusy) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.trim().toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      toast.error('Для сертификата можно загрузить только PDF-файл');
      return;
    }

    if (file.size > MAX_CERTIFICATE_FILE_MB * 1024 * 1024) {
      toast.error(`Файл больше ${MAX_CERTIFICATE_FILE_MB} МБ`);
      return;
    }

    setIsUploadingFile(true);
    try {
      if (uploadedFile?.id) {
        try {
          await deleteFile(uploadedFile.id);
        } catch {
          // Если старый временный файл уже недоступен, не блокируем замену новым.
        }
      }

      const uploaded = (await uploadFile(file, 'CERTIFICATE')) as UploadedCertificateFile;

      try {
        await updateFile(uploaded.id, 'CERTIFICATE');
      } catch {
        toast.info('Файл загружен, но не удалось обновить метаданные.');
      }

      setUploadedFile(uploaded);
      setUploadedFileId(uploaded.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось загрузить сертификат');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteUploadedFile = async () => {
    if (!uploadedFile || isBusy) return;

    try {
      await deleteFile(uploadedFile.id);
      setUploadedFile(null);
      setUploadedFileId('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить файл');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handlePdfDrop,
    onDropRejected: () => toast.error('Для сертификата можно загрузить только PDF-файл'),
    multiple: false,
    accept: { 'application/pdf': ['.pdf'] },
    disabled: isBusy,
  });

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[520px]">
      <div className="relative">
        <label className="block text-[13px] font-semibold text-[var(--color-blue-dark)]">
          Пользователь
        </label>
        <input
          type="text"
          value={userSearchInput}
          onChange={(e) => {
            const v = e.target.value;
            setUserSearchInput(v);
            setEmail(v);
            setSelectedUserId(null);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (userSearchInput.trim()) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          className={`input-design h-[32px] pr-8 ${
            hasResolvedUser
              ? 'border-[var(--color-green-brand)]'
              : hasUnresolvedUserInput
                ? 'border-[var(--color-danger)]'
                : ''
          }`}
          placeholder="Email или ФИО"
          autoComplete="off"
          required
        />
        {hasResolvedUser || hasUnresolvedUserInput ? (
          <span
            className={`pointer-events-none absolute right-2 top-[27px] text-[20px] font-extrabold leading-none ${
              hasResolvedUser ? 'text-[var(--color-green-brand)]' : 'text-[var(--color-danger)]'
            }`}
          >
            {hasResolvedUser ? '✓' : '×'}
          </span>
        ) : null}

        {showSuggestions && userSearchInput.trim() && matchedUsers.length > 0 && (
          <div
            className="absolute z-30 mt-1 max-h-[310px] w-full overflow-auto rounded-[10px] bg-white shadow-[0_2px_12px_rgba(31,48,94,0.16)]"
          >
            {matchedUsers.map((u: any) => (
              <button
                key={u.id}
                type="button"
                className="w-full border-b border-[#DCE8EC] px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#F5F8FA]"
                onClick={() => {
                  setEmail(u.email);
                  setUserSearchInput(u.fullName || u.email);
                  setSelectedUserId(u.id);
                  setShowSuggestions(false);
                }}
              >
                <div className="font-semibold text-[var(--color-blue-dark)]">
                  {u.fullName || 'Без имени'}
                </div>
                <div className="text-[#6B7894]">{u.email}</div>
                {u.groups && u.groups.length > 0 && (
                  <div className="text-[#6B7894]">{u.groups.map((g: any) => g.name).join(', ')}</div>
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
              className="absolute z-30 mt-1 w-full rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#6B7894] shadow-[0_2px_12px_rgba(31,48,94,0.16)]"
            >
              Пользователь не найден. Можно ввести email вручную.
            </div>
          )}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-blue-dark)]">
            Группа сертификата
          </label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-design h-[32px]"
            disabled
            required
          >
            <option value="">
              {hasResolvedUser ? 'Нет активного цикла' : 'Сначала выберите пользователя'}
            </option>
            {certificateTitle ? <option value={certificateTitle}>{certificateTitle}</option> : null}
          </select>
          {hasResolvedUser && !certificateTitle ? (
            <p className="mt-1 text-[12px] font-semibold text-[var(--color-danger)]">
              Сертификат можно выдать только по текущему циклу пользователя.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-blue-dark)]">
            Номер сертификата
          </label>
          <div className="flex h-[32px] overflow-hidden rounded-[10px] border border-[#B8C4D8] bg-white focus-within:border-[var(--color-blue-dark)] focus-within:shadow-[0_0_0_2px_rgba(31,48,94,0.12)]">
            <span className="flex shrink-0 items-center border-r border-[#DCE3EF] bg-[#F7F9FB] px-3 text-[13px] text-[#6B7894]">
              {CERTIFICATE_NUMBER_PREFIX}
            </span>
            <input
              value={numberSuffix}
              onChange={(e) => setNumberSuffix(normalizeCertificateNumberSuffix(e.target.value))}
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-[13px] text-[var(--color-blue-dark)] outline-none"
              inputMode="decimal"
              maxLength={8}
              pattern="[0-9.]{1,8}"
              required
            />
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-blue-dark)]">
            Дата выдачи
          </label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="input-design h-[32px]"
            required
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-blue-dark)]">
            Действителен до
          </label>
          <input
            type="date"
            value={expiresDate}
            onChange={(e) => setExpiresDate(e.target.value)}
            className="input-design h-[32px]"
            required
          />
        </div>
      </div>

      <div className="mt-8">
        <label className="mb-1 block text-center text-[13px] font-semibold text-[var(--color-blue-dark)]">
          Сертификат
        </label>

        <div
          {...getRootProps()}
          className={`flex min-h-[126px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed border-[#B8C4D8] px-5 text-center text-[14px] text-[#A7B1C7] transition hover:bg-[#F7F9FB] ${
            uploadedFile ? 'min-h-[34px]' : ''
          } ${isBusy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} />
          {isUploadingFile
            ? 'Загрузка...'
            : isDragActive
              ? 'Отпустите PDF здесь'
              : uploadedFile
                ? 'Заменить файл'
                : 'Выберите или перетащите файл PDF'}
        </div>

        {uploadedFile ? (
          <div className="mt-3 flex items-center gap-3 rounded-[10px] bg-white p-3 shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
            <div className="h-[76px] w-[60px] shrink-0 rounded-[4px] border border-[#C9D2E2] bg-white" />
            <div className="min-w-0 flex-1 truncate text-[13px] text-[#222]">{uploadedFile.name}</div>
            <a
              href={`/uploads/${uploadedFile.fileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn h-[28px] rounded-full border border-[var(--color-blue-dark)] px-3 text-[12px] font-semibold text-[var(--color-blue-dark)]"
            >
              Открыть
            </a>
            <button
              type="button"
              onClick={handleDeleteUploadedFile}
              disabled={isBusy}
              className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#B8C4D8] opacity-70 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Удалить файл сертификата"
            >
              <img src={EXIT_ICON} alt="" className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || isBusy}
        className="btn mt-7 h-[44px] w-full rounded-[10px] bg-[var(--color-blue-dark)] text-[14px] font-extrabold text-white transition hover:bg-[var(--color-blue-darker)] disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
      >
        {mutation.isPending ? 'Выдаю...' : 'Выдать сертификат'}
      </button>
    </form>
  );
}
