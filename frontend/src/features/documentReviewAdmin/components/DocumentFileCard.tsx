import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import { documentTypeLabels } from '@/utils/documentTypeLabels';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import type { DocumentReviewFileStatus } from '../api/updateDocumentReviewFile';

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

type PendingAction = 'REJECTED' | 'DELETED' | null;

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
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const fileAvailable = item.status !== 'DELETED';
  const hasDeletionRequest = Boolean(item.deletionRequestedAt) && fileAvailable;
  const canAccept = item.status !== 'CONFIRMED' && fileAvailable;
  const canReject = item.status !== 'REJECTED' && fileAvailable;
  const canSoftDelete = fileAvailable;
  const fileHref = `/uploads/${item.file.fileId}`;

  const actionLabel = pendingAction === 'REJECTED' ? 'Причина отклонения' : 'Причина удаления';
  const actionButtonLabel = pendingAction === 'REJECTED' ? 'Отклонить' : 'Удалить';

  const submitPendingAction = () => {
    if (!pendingAction) return;
    onStatus(pendingAction);
    setPendingAction(null);
  };

  return (
    <article
      className={`rounded-[12px] border px-3 py-3 shadow-[0_1px_7px_rgba(31,48,94,0.06)] transition sm:px-4 ${
        hasDeletionRequest
          ? 'border-[var(--color-danger)] bg-[rgba(255,83,100,0.04)]'
          : item.status === 'CONFIRMED'
            ? 'border-[var(--color-green-light)] bg-[rgba(165,203,55,0.08)]'
            : 'border-[var(--color-blue-soft)] bg-white'
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-[58px_minmax(180px,1fr)_220px_auto] sm:items-center">
        <FilePreview item={item} fileHref={fileHref} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {fileAvailable ? (
              <a
                href={fileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-[14px] font-extrabold text-[var(--color-blue-dark)] underline"
                title={item.file.name}
              >
                {item.file.name}
              </a>
            ) : (
              <span className="min-w-0 truncate text-[14px] font-extrabold text-[#6B7894]" title={item.file.name}>
                {item.file.name}
              </span>
            )}
            <StatusPill tone={fileStatusTone[item.status]} size="md" className="h-[24px]">
              {fileStatusLabels[item.status]}
            </StatusPill>
          </div>
          {item.transferredFromPreviousRequest ? (
            <p className="mt-1 text-[11px] font-semibold text-[#6B7894]">Перенесен из прошлой сертификации</p>
          ) : null}
          {item.status === 'REJECTED' && item.adminComment ? (
            <p className="mt-1 text-[12px] text-[var(--color-danger)]">Причина: {item.adminComment}</p>
          ) : null}
        </div>

        <label className="block text-[12px] font-semibold text-[#6B7894]">
          <span className="sr-only">Тип документа</span>
          <select
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
            disabled={disabled || !fileAvailable}
            aria-label={`Тип документа: ${item.file.name}`}
            className="input-design h-[36px] text-[13px]"
          >
            <option value="">Выберите тип</option>
            {Object.entries(documentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-start gap-2 sm:justify-end">
          {canTransfer ? (
            <button
              type="button"
              onClick={onTransfer}
              disabled={actionsDisabled}
              className="btn h-9 rounded-full bg-[var(--color-blue-dark)] px-3 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#B8C4D8]"
            >
              В текущий цикл
            </button>
          ) : item.status === 'DELETED' ? (
            <button
              type="button"
              onClick={onDeleteForever}
              disabled={actionsDisabled || disabled}
              className="btn h-9 rounded-full border-2 border-[var(--color-danger)] px-3 text-[12px] font-extrabold text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Удалить насовсем
            </button>
          ) : (
            <>
              {canAccept ? (
                <IconButton
                  title="Принять"
                  disabled={actionsDisabled || disabled}
                  onClick={() => onStatus('CONFIRMED')}
                  className="bg-[var(--color-blue-dark)] text-white hover:bg-[#172652]"
                >
                  <Check className="h-5 w-5" strokeWidth={2.6} />
                </IconButton>
              ) : null}
              {canReject ? (
                <IconButton
                  title="Отклонить"
                  disabled={actionsDisabled || disabled}
                  onClick={() => setPendingAction('REJECTED')}
                  className="border-2 border-[var(--color-blue-dark)] text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)]"
                >
                  <X className="h-5 w-5" strokeWidth={2.6} />
                </IconButton>
              ) : null}
              {canSoftDelete ? (
                <IconButton
                  title="Удалить"
                  disabled={actionsDisabled || disabled}
                  onClick={() => setPendingAction('DELETED')}
                  className="border-2 border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[rgba(255,83,100,0.08)]"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.4} />
                </IconButton>
              ) : null}
            </>
          )}
        </div>
      </div>

      {hasDeletionRequest ? (
        <div className="mt-3 rounded-[9px] bg-[rgba(255,83,100,0.10)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
          <span className="font-extrabold">Пользователь просит удалить файл.</span>{' '}
          {item.deletionRequestComment || 'Причина не указана'}
        </div>
      ) : null}

      {pendingAction ? (
        <div className="mt-3 grid gap-2 rounded-[10px] border border-[var(--color-blue-soft)] bg-[#F7F8FA] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-[12px] font-semibold">
            {actionLabel}
            <textarea
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              className="input-design mt-1 min-h-[62px] resize-y py-2 text-[13px]"
              placeholder={pendingAction === 'REJECTED' ? 'Почему документ не принят' : 'Почему файл нужно удалить'}
              autoFocus
            />
          </label>
          <div className="flex gap-2 sm:pb-0.5">
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="btn h-9 rounded-full border border-[var(--color-blue-dark)] px-3 text-[12px] font-extrabold text-[var(--color-blue-dark)]"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={submitPendingAction}
              disabled={actionsDisabled || disabled || !comment.trim()}
              className="btn h-9 rounded-full bg-[var(--color-danger)] px-3 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {actionButtonLabel}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FilePreview({ item, fileHref }: { item: ReviewFile; fileHref: string }) {
  if (item.status === 'DELETED') {
    return (
      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[8px] bg-[#F0F0F0] text-[10px] font-extrabold text-[#8D96B5]">
        Удалено
      </div>
    );
  }

  return (
    <a
      href={fileHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Открыть файл ${item.file.name} в новой вкладке`}
      title="Открыть файл в новой вкладке"
      className="block w-fit rounded-[8px] transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-dark)]"
    >
      {item.file.mimeType.startsWith('image/') ? (
        <img
          src={fileHref}
          alt={item.file.name}
          className="h-[54px] w-[54px] rounded-[8px] border border-[#DCE3EF] object-cover"
        />
      ) : item.file.mimeType === 'application/pdf' ? (
        <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[8px] bg-[var(--color-danger)] text-[13px] font-extrabold text-white">
          PDF
        </span>
      ) : (
        <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[8px] bg-[#F0F0F0] text-[10px] text-[#6B7894]">
          FILE
        </span>
      )}
    </a>
  );
}

function IconButton({
  title,
  disabled,
  onClick,
  className,
  children,
}: {
  title: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={`${title} документ`}
      className={`btn flex h-9 w-9 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}
