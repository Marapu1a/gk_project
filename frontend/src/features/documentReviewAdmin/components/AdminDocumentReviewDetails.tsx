import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageNav } from '@/components/PageNav';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import {
  documentReviewStatusLabels,
} from '@/utils/documentReviewStatusLabels';
import { useUserPaymentsById } from '@/features/payment/hooks/useUserPaymentsById';
import { useGetDocReviewRequestById } from '../hooks/useGetDocReviewRequestById';
import {
  useDeleteDocumentReviewFile,
  useUpdateDocumentReviewFile,
} from '../hooks/useUpdateDocumentReviewFile';
import type { DocumentReviewFileStatus } from '../api/updateDocumentReviewFile';

const DELETED_ICON = '/dashboard-v2/deleted.svg';

const fileStatusLabels: Record<DocumentReviewFileStatus, string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Принято',
  REJECTED: 'Отклонено',
  DELETED: 'Удалено',
};

const fileStatusClass: Record<DocumentReviewFileStatus, string> = {
  UNCONFIRMED: 'bg-[#C9D8FF] text-[var(--color-blue-dark)]',
  CONFIRMED: 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]',
  REJECTED: 'bg-[rgba(255,83,100,0.18)] text-[var(--color-danger)]',
  DELETED: 'bg-[#E7E9EF] text-[#6B7894]',
};

const paymentStatusText: Record<string, string> = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает проверки',
  PAID: 'Оплачено',
};

type ReviewFile = {
  id: string;
  status: DocumentReviewFileStatus;
  type?: string | null;
  adminComment?: string | null;
  deletionRequestedAt?: string | null;
  deletionRequestComment?: string | null;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
    type?: string | null;
    comment?: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function normalizeReviewFiles(request: any): ReviewFile[] {
  if (Array.isArray(request?.documentFiles) && request.documentFiles.length > 0) {
    return request.documentFiles;
  }

  return (request?.documents ?? []).map((file: any) => ({
    id: `legacy-${file.id}`,
    status:
      request.status === 'CONFIRMED'
        ? 'CONFIRMED'
        : request.status === 'REJECTED'
          ? 'REJECTED'
          : 'UNCONFIRMED',
    type: file.type,
    adminComment: request.status === 'REJECTED' ? request.comment : null,
    file,
  }));
}

export function AdminDocumentReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, error } = useGetDocReviewRequestById(id);
  const updateFile = useUpdateDocumentReviewFile(id);
  const deleteFileRecord = useDeleteDocumentReviewFile(id);
  const { confirm } = useConfirm();

  const [comments, setComments] = useState<Record<string, string>>({});
  const [types, setTypes] = useState<Record<string, string>>({});

  const { data: payments } = useUserPaymentsById(request?.user?.id);
  const documentPayment = payments?.find((p) => p.type === 'DOCUMENT_REVIEW');

  const reviewFiles = useMemo(() => normalizeReviewFiles(request), [request]);

  useEffect(() => {
    const nextComments: Record<string, string> = {};
    const nextTypes: Record<string, string> = {};

    reviewFiles.forEach((item) => {
      nextComments[item.id] = item.adminComment ?? '';
      nextTypes[item.id] = item.type ?? item.file.type ?? '';
    });

    setComments(nextComments);
    setTypes(nextTypes);
  }, [reviewFiles]);

  if (isLoading) return <p className="p-6 text-[var(--color-blue-dark)]">Загрузка...</p>;
  if (error) return <p className="p-6 text-[var(--color-danger)]">Ошибка загрузки</p>;
  if (!request) return <p className="p-6 text-[var(--color-danger)]">Заявка не найдена</p>;

  const isLegacyFallback = reviewFiles.some((item) => item.id.startsWith('legacy-'));
  const activeCycle = request.user?.cycles?.[0] ?? null;
  const activeGroup =
    request.user?.groups
      ?.map((item: any) => item.group)
      ?.sort((a: any, b: any) => b.rank - a.rank)?.[0] ?? null;

  const canConfirmWithoutPayment =
    activeCycle?.type === 'RENEWAL' &&
    (activeGroup?.name === 'Супервизор' || activeGroup?.name === 'Опытный Супервизор');

  const handleTypeChange = async (item: ReviewFile, type: string) => {
    setTypes((prev) => ({ ...prev, [item.id]: type }));
    if (item.id.startsWith('legacy-')) return;

    try {
      await updateFile.mutateAsync({
        fileReviewId: item.id,
        payload: { type },
      });
      toast.success('Тип документа обновлен');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось обновить тип документа');
    }
  };

  const handleStatus = async (item: ReviewFile, status: DocumentReviewFileStatus) => {
    if (item.id.startsWith('legacy-')) {
      toast.info('Это старая запись без пофайлового управления');
      return;
    }

    const comment = comments[item.id]?.trim() || '';

    if ((status === 'REJECTED' || status === 'DELETED') && !comment) {
      toast.error('Для отклонения или удаления нужен комментарий');
      return;
    }

    if (status === 'DELETED') {
      const ok = await confirm({
        message: 'Удалить файл из хранилища?',
        description: 'Запись останется в заявке с пометкой "Удалено".',
        confirmLabel: 'Удалить',
        variant: 'danger',
      });
      if (!ok) return;
    }

    try {
      await updateFile.mutateAsync({
        fileReviewId: item.id,
        payload: {
          status,
          type: types[item.id] || item.type || item.file.type || null,
          adminComment: comment || null,
        },
      });
      toast.success('Документ обновлен');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось обновить документ');
    }
  };

  const handleDeleteForever = async (item: ReviewFile) => {
    if (item.id.startsWith('legacy-')) {
      toast.info('Это старая запись без пофайлового управления');
      return;
    }

    const ok = await confirm({
      message: 'Удалить запись о документе насовсем?',
      description: 'Файл и запись исчезнут из заявки.',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteFileRecord.mutateAsync(item.id);
      toast.success('Документ удален из заявки');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось удалить документ');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] px-4 py-6 text-[var(--color-blue-dark)]">
      <section className="mx-auto max-w-[1040px] overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--color-blue-soft)] px-6 py-5">
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight">
              Заявка {request.id.slice(0, 6)}
            </h1>
            <p className="mt-1 text-[13px] text-[#8D96B5]">
              Подана: {formatDate(request.submittedAt)}
            </p>
          </div>
          <PageNav className="shrink-0" />
        </header>

        <div className="space-y-7 px-6 py-6">
          <section className="grid gap-4 rounded-[14px] bg-[#F7F8FA] p-4 md:grid-cols-2">
            <InfoLine label="Email" value={request.user?.email ?? '—'} />
            <InfoLine
              label="Статус"
              value={documentReviewStatusLabels[request.status] || request.status}
            />
            <InfoLine
              label="Оплата"
              value={
                documentPayment
                  ? paymentStatusText[documentPayment.status] || documentPayment.status
                  : 'Нет информации'
              }
            />
            <InfoLine
              label="Комментарий заявки"
              value={request.comment || '—'}
            />
            {canConfirmWithoutPayment ? (
              <div className="md:col-span-2 rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-[13px]">
                Подтверждение без оплаты разрешено для ресертификации супервизора.
              </div>
            ) : null}
            {isLegacyFallback ? (
              <div className="md:col-span-2 rounded-[10px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] text-[var(--color-danger)]">
                Это старая заявка без новой пофайловой структуры. Она отображается для истории.
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-extrabold">Файлы</h2>

            {reviewFiles.length === 0 ? (
              <p className="rounded-[12px] bg-[#F7F8FA] px-4 py-5 text-[14px] text-[#6B7894]">
                Нет файлов
              </p>
            ) : (
              <div className="space-y-4">
                {reviewFiles.map((item) => (
                  <DocumentFileCard
                    key={item.id}
                    item={item}
                    type={types[item.id] ?? ''}
                    comment={comments[item.id] ?? ''}
                    disabled={
                      updateFile.isPending ||
                      deleteFileRecord.isPending ||
                      item.id.startsWith('legacy-')
                    }
                    onTypeChange={(type) => handleTypeChange(item, type)}
                    onCommentChange={(comment) =>
                      setComments((prev) => ({ ...prev, [item.id]: comment }))
                    }
                    onStatus={(status) => handleStatus(item, status)}
                    onDeleteForever={() => handleDeleteForever(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[14px]">
      <span className="font-extrabold">{label}: </span>
      <span className="text-[#222]">{value}</span>
    </div>
  );
}

function DocumentFileCard({
  item,
  type,
  comment,
  disabled,
  onTypeChange,
  onCommentChange,
  onStatus,
  onDeleteForever,
}: {
  item: ReviewFile;
  type: string;
  comment: string;
  disabled: boolean;
  onTypeChange: (type: string) => void;
  onCommentChange: (comment: string) => void;
  onStatus: (status: DocumentReviewFileStatus) => void;
  onDeleteForever: () => void;
}) {
  const fileAvailable = item.status !== 'DELETED';
  const hasDeletionRequest = Boolean(item.deletionRequestedAt) && item.status !== 'DELETED';

  return (
    <article
      className={`grid gap-4 rounded-[14px] border bg-white p-4 shadow-[0_1px_8px_rgba(31,48,94,0.08)] md:grid-cols-[96px_minmax(0,1fr)_220px] ${
        hasDeletionRequest
          ? 'border-[var(--color-danger)]'
          : 'border-[var(--color-blue-soft)]'
      }`}
    >
      <div className="flex items-center justify-center">
        {item.status === 'DELETED' ? (
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[10px] bg-[#F0F0F0]">
            <img
              src={DELETED_ICON}
              alt=""
              className="h-12 w-12"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-[12px] font-extrabold text-[#8D96B5]">Удалено</span>
          </div>
        ) : item.file.mimeType.startsWith('image/') ? (
          <img
            src={`/uploads/${item.file.fileId}`}
            alt={item.file.name}
            className="h-[84px] w-[84px] rounded-[10px] border border-[#DCE3EF] object-cover"
          />
        ) : item.file.mimeType === 'application/pdf' ? (
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[10px] bg-[var(--color-danger)] text-[18px] font-extrabold text-white">
            PDF
          </div>
        ) : (
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[10px] bg-[#F0F0F0] text-[12px] text-[#6B7894]">
            FILE
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        {hasDeletionRequest ? (
          <div className="flex items-start gap-3 rounded-[12px] border border-[var(--color-danger)] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[var(--color-danger)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-[26px] font-extrabold leading-none text-white">
              !
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold leading-tight">
                Пользователь просит удалить документ
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.35]">
                {item.deletionRequestComment || 'Причина не указана'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {fileAvailable ? (
            <a
              href={`/uploads/${item.file.fileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-[15px] font-extrabold text-[var(--color-blue-dark)] underline"
            >
              {item.file.name}
            </a>
          ) : (
            <span className="min-w-0 truncate text-[15px] font-extrabold text-[#6B7894]">
              {item.file.name}
            </span>
          )}

          <span
            className={`inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold ${fileStatusClass[item.status]}`}
          >
            {fileStatusLabels[item.status]}
          </span>
        </div>

        <label className="block text-[13px] font-semibold">
          Тип документа
          <select
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
            disabled={disabled || item.status === 'DELETED'}
            className="input-design mt-1 h-[32px]"
          >
            <option value="">Выберите тип</option>
            {Object.entries(documentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[13px] font-semibold">
          Комментарий админа
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            disabled={disabled || item.status === 'DELETED'}
            className="input-design mt-1 min-h-[70px] resize-y py-2"
            placeholder="Комментарий к документу"
          />
        </label>
      </div>

      <div className="flex flex-col justify-center gap-2">
        {item.status === 'DELETED' ? (
          <button
            type="button"
            onClick={onDeleteForever}
            disabled={disabled}
            className="btn min-h-[40px] rounded-full bg-[var(--color-danger)] px-4 text-[13px] font-extrabold leading-tight text-white disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
          >
            Удалить насовсем
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onStatus('CONFIRMED')}
              disabled={disabled}
              className="btn h-[36px] rounded-full bg-[var(--color-blue-dark)] px-4 text-[13px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
            >
              Принять
            </button>
            <button
              type="button"
              onClick={() => onStatus('REJECTED')}
              disabled={disabled}
              className="btn h-[36px] rounded-full border-2 border-[var(--color-blue-dark)] px-4 text-[13px] font-extrabold text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Отклонить
            </button>
            <button
              type="button"
              onClick={() => onStatus('DELETED')}
              disabled={disabled}
              className="btn h-[36px] rounded-full border-2 border-[var(--color-danger)] px-4 text-[13px] font-extrabold text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Удалить
            </button>
          </>
        )}
      </div>
    </article>
  );
}
