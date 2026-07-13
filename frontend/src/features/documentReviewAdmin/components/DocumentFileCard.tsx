import { Check, Trash2, X } from 'lucide-react';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import { documentTypeLabels } from '@/utils/documentTypeLabels';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import type { DocumentReviewFileStatus } from '../api/updateDocumentReviewFile';

const DELETED_ICON = '/dashboard-v2/deleted.svg';

const fileStatusLabels: Record<DocumentReviewFileStatus, string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Принято',
  REJECTED: 'Отклонено',
  DELETED: 'Удалено',
};

const fileStatusTone: Record<DocumentReviewFileStatus, StatusPillTone> = {
  UNCONFIRMED: 'partial',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  DELETED: 'neutral',
};

export type ReviewFile = {
  id: string;
  status: DocumentReviewFileStatus;
  type?: string | null;
  adminComment?: string | null;
  deletionRequestedAt?: string | null;
  deletionRequestComment?: string | null;
  transferredFromPreviousRequest?: boolean;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
    type?: string | null;
    comment?: string | null;
  };
};

export function DocumentFileCard({
  item,
  type,
  comment,
  disabled,
  actionsDisabled,
  canTransfer,
  onTypeChange,
  onCommentChange,
  onStatus,
  onDeleteForever,
  onTransfer,
}: {
  item: ReviewFile;
  type: string;
  comment: string;
  disabled: boolean;
  actionsDisabled: boolean;
  canTransfer: boolean;
  onTypeChange: (type: string) => void;
  onCommentChange: (comment: string) => void;
  onStatus: (status: DocumentReviewFileStatus) => void;
  onDeleteForever: () => void;
  onTransfer: () => void;
}) {
  const fileAvailable = item.status !== 'DELETED';
  const hasDeletionRequest = Boolean(item.deletionRequestedAt) && item.status !== 'DELETED';
  const canAccept = item.status !== 'CONFIRMED' && item.status !== 'DELETED';
  const canReject = item.status !== 'REJECTED' && item.status !== 'DELETED';
  const canSoftDelete = item.status !== 'DELETED';

  const toneClass = hasDeletionRequest
    ? 'border-[var(--color-danger)] bg-white'
    : item.status === 'CONFIRMED'
      ? 'border-[var(--color-green-light)] bg-[rgba(165,203,55,0.12)]'
      : 'border-[var(--color-blue-soft)] bg-white';

  return (
    <article
      className={`grid gap-4 rounded-[14px] border p-4 shadow-[0_1px_8px_rgba(31,48,94,0.08)] md:grid-cols-[96px_minmax(0,1fr)_220px] ${toneClass}`}
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

          <StatusPill
            tone={fileStatusTone[item.status]}
            size="md"
            className="h-[26px]"
          >
            {fileStatusLabels[item.status]}
          </StatusPill>

          {item.transferredFromPreviousRequest ? (
            <StatusPill tone="info" size="md">
              Перенесен из прошлой сертификации
            </StatusPill>
          ) : null}
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

      <div className="flex flex-col justify-center gap-3">
        {canTransfer ? (
          <button
            type="button"
            onClick={onTransfer}
            disabled={actionsDisabled}
            className="btn min-h-[38px] rounded-full bg-[var(--color-blue-dark)] px-4 text-[13px] font-extrabold leading-tight text-white disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
          >
            В текущую сертификацию
          </button>
        ) : null}

        {item.status === 'DELETED' ? (
          <button
            type="button"
            onClick={onDeleteForever}
            disabled={actionsDisabled || disabled}
            className="btn min-h-[36px] rounded-full border-2 border-[var(--color-danger)] px-4 text-[13px] font-extrabold leading-tight text-[var(--color-danger)] hover:bg-[rgba(255,83,100,0.08)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Удалить насовсем
          </button>
        ) : (
          <div className="flex justify-center gap-2">
            {canAccept ? (
              <button
                type="button"
                onClick={() => onStatus('CONFIRMED')}
                disabled={actionsDisabled || disabled}
                title="Принять"
                aria-label="Принять документ"
                className="btn flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-blue-dark)] text-white hover:bg-[#172652] disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
              >
                <Check className="h-5 w-5" strokeWidth={2.6} />
              </button>
            ) : null}
            {canReject ? (
              <button
                type="button"
                onClick={() => onStatus('REJECTED')}
                disabled={actionsDisabled || disabled}
                title="Отклонить"
                aria-label="Отклонить документ"
                className="btn flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[var(--color-blue-dark)] text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <X className="h-5 w-5" strokeWidth={2.6} />
              </button>
            ) : null}
            {canSoftDelete ? (
              <button
                type="button"
                onClick={() => onStatus('DELETED')}
                disabled={actionsDisabled || disabled}
                title="Удалить"
                aria-label="Удалить документ"
                className="btn flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[rgba(255,83,100,0.08)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.4} />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
