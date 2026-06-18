import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { ModalCloseButton } from '@/components/ModalCloseButton';
import { PageNav } from '@/components/PageNav';
import { DocumentReviewForm } from '@/features/documentReview/components/DocumentReviewForm';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useRequestDocumentDeletion } from '@/features/documentReview/hooks/useRequestDocumentDeletion';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { documentTypeLabels } from '@/utils/documentTypeLabels';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

type FileStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'DELETED';

type ReviewFile = {
  id: string;
  status: FileStatus;
  type?: string | null;
  adminComment?: string | null;
  deletionRequestedAt?: string | null;
  deletionRequestComment?: string | null;
  reviewedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
    type?: string | null;
    createdAt?: string | null;
  };
};

const paymentStatusLabels = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает подтверждения',
  PAID: 'Оплачено',
} as const;

const fileStatusLabels: Record<FileStatus, string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Одобрено',
  REJECTED: 'Отклонено',
  DELETED: 'Удалено',
};

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
    reviewedAt: request.reviewedAt,
    createdAt: request.submittedAt,
    file,
  }));
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('ru-RU');
}

function getStatusDate(item: ReviewFile, requestSubmittedAt?: string | null) {
  return formatDate(item.reviewedAt ?? item.deletedAt ?? item.createdAt ?? requestSubmittedAt);
}

export default function DocumentReviewPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<ReviewFile | null>(null);
  const { data: request, isLoading } = useGetDocReviewReq();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: payments, isLoading: paymentsLoading } = useUserPayments();
  const deletionRequest = useRequestDocumentDeletion();

  const documentPayment = payments?.find((payment) => payment.type === 'DOCUMENT_REVIEW');
  const paymentStatus = documentPayment?.status ?? 'UNPAID';
  const isDocumentReviewPaid =
    paymentStatus === 'PAID' ||
    Boolean(
      payments?.some((payment) => payment.type === 'FULL_PACKAGE' && payment.status === 'PAID'),
    );
  const paymentStatusLabel = isDocumentReviewPaid
    ? paymentStatusLabels.PAID
    : paymentStatusLabels[paymentStatus];

  const reviewFiles = useMemo(() => normalizeReviewFiles(request), [request]);
  const activeCycleId = currentUser?.activeCycle?.id ?? null;
  const isArchiveRequest = Boolean(
    request && activeCycleId && request.cycleId !== activeCycleId,
  );

  if (isLoading || paymentsLoading || userLoading) {
    return <p className="p-6 text-sm text-blue-dark">Загрузка...</p>;
  }

  return (
    <div className="min-h-[calc(100vh-220px)] bg-[#F0F0F0] px-4 pb-10 text-[var(--color-blue-dark)]">
      <div className="mx-auto max-w-[760px]">
        <div className="relative mb-5 flex min-h-[34px] items-center justify-center">
          <div className="absolute left-0 top-0">
            <PageNav />
          </div>
          <h1 className="text-center text-[22px] font-extrabold leading-tight">Мои документы</h1>
        </div>

        <div className="mx-auto max-w-[620px]">
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className={`btn btn-dark block w-full rounded-[10px] text-[15px] font-extrabold transition-all duration-300 ease-out ${
              isUploadOpen
                ? 'pointer-events-none h-0 overflow-hidden opacity-0'
                : 'h-[52px] opacity-100'
            }`}
            aria-hidden={isUploadOpen}
            tabIndex={isUploadOpen ? -1 : 0}
          >
            Загрузить
          </button>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              isUploadOpen ? 'mt-0 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0">
              <DocumentReviewForm
                paymentStatusLabel={paymentStatusLabel}
                isDocumentReviewPaid={isDocumentReviewPaid}
                onCollapse={() => setIsUploadOpen(false)}
              />
            </div>
          </div>
        </div>

        <section className="mt-9">
          <h2 className="mb-5 text-center text-[22px] font-extrabold leading-tight">История</h2>

          {isArchiveRequest ? (
            <div className="mx-auto mb-4 max-w-[620px] rounded-[12px] bg-[var(--color-blue-soft)] px-5 py-4 text-[14px] font-semibold text-[var(--color-blue-dark)]">
              Ниже показаны документы из предыдущего периода. Они сохранены для истории, но не
              подтверждают документы текущего цикла сертификации. Для текущего цикла загрузите
              документы заново.
            </div>
          ) : null}

          {reviewFiles.length === 0 ? (
            <p className="mx-auto max-w-[620px] rounded-[12px] bg-white px-5 py-5 text-center text-[14px] text-[#8D96B5] shadow-soft">
              Документы пока не загружены.
            </p>
          ) : (
            <div className="mx-auto max-w-[620px] space-y-3">
              {reviewFiles.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  statusDate={getStatusDate(item, request?.submittedAt)}
                  onRequestDelete={() => setDeleteRequestTarget(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {deleteRequestTarget ? (
        <DeletionRequestModal
          fileName={deleteRequestTarget.file.name}
          isPending={deletionRequest.isPending}
          onClose={() => setDeleteRequestTarget(null)}
          onSubmit={async (comment) => {
            try {
              await deletionRequest.mutateAsync({
                fileReviewId: deleteRequestTarget.id,
                comment,
              });
              toast.success(UI_TOAST_MESSAGES.documents.deleteRequestSent);
              setDeleteRequestTarget(null);
            } catch (err: any) {
              toast.error(err?.response?.data?.error || UI_TOAST_MESSAGES.documents.deleteRequestFailed);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function HistoryRow({
  item,
  statusDate,
  onRequestDelete,
}: {
  item: ReviewFile;
  statusDate: string | null;
  onRequestDelete: () => void;
}) {
  const type = item.type ?? item.file.type ?? '';
  const typeLabel = type ? documentTypeLabels[type] ?? type : 'Другое';
  const isDeleted = item.status === 'DELETED';
  const hasDeletionRequest = Boolean(item.deletionRequestedAt);

  return (
    <article className="grid gap-3 rounded-[10px] bg-white p-3 shadow-[0_2px_10px_rgba(31,48,94,0.12)] sm:grid-cols-[74px_minmax(0,1fr)_auto] sm:items-center">
      <FilePreview file={item.file} deleted={isDeleted} />

      <div className="min-w-0">
        <p
          className={`truncate text-[13px] ${isDeleted ? 'text-[#A7B1C7]' : 'text-[#222]'}`}
          title={item.file.name}
        >
          {item.file.name}
        </p>
        <p className="mt-1 text-[12px] text-[#8D96B5]">{typeLabel}</p>
        <p className={`mt-1 text-[12px] font-extrabold ${statusTextClass(item.status)}`}>
          {fileStatusLabels[item.status]}
          {statusDate ? <span className="ml-1 font-medium text-[#8D96B5]">{statusDate}</span> : null}
        </p>
        {item.adminComment ? (
          <p className="mt-1 line-clamp-2 text-[12px] text-[#8D96B5]">{item.adminComment}</p>
        ) : null}
        {hasDeletionRequest ? (
          <p className="mt-1 text-[12px] font-semibold text-[var(--color-danger)]">
            Запрос на удаление отправлен
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        {!isDeleted ? (
          <a
            href={`/uploads/${item.file.fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn h-[32px] rounded-full border border-[#A7B1C7] px-4 text-[13px] font-semibold text-[var(--color-blue-dark)]"
          >
            Открыть
          </a>
        ) : null}
        <button
          type="button"
          onClick={onRequestDelete}
          disabled={isDeleted || item.id.startsWith('legacy-')}
          className="btn h-[32px] rounded-full border border-[#A7B1C7] px-4 text-[13px] font-semibold text-[var(--color-blue-dark)]"
        >
          {hasDeletionRequest ? 'Изменить запрос' : 'Запросить удаление'}
        </button>
      </div>
    </article>
  );
}

function FilePreview({
  file,
  deleted,
}: {
  file: ReviewFile['file'];
  deleted: boolean;
}) {
  if (deleted) {
    return (
      <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[4px] border border-[#C9D2E2] bg-[#F7F8FA] text-[11px] font-extrabold text-[#A7B1C7]">
        Удалено
      </div>
    );
  }

  if (file.mimeType.startsWith('image/')) {
    return (
      <img
        src={`/uploads/${file.fileId}`}
        alt=""
        className="h-[74px] w-[74px] rounded-[4px] border border-[#C9D2E2] object-cover"
      />
    );
  }

  return (
    <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[4px] border border-[#C9D2E2] bg-[#F7F8FA] text-[12px] font-extrabold text-[#8D96B5]">
      {file.mimeType === 'application/pdf' ? 'PDF' : 'FILE'}
    </div>
  );
}

function statusTextClass(status: FileStatus) {
  if (status === 'CONFIRMED') return 'text-[var(--color-blue-dark)]';
  if (status === 'REJECTED') return 'text-[var(--color-danger)]';
  if (status === 'DELETED') return 'text-[#8D96B5]';
  return 'text-[#6B7894]';
}

function DeletionRequestModal({
  fileName,
  isPending,
  onClose,
  onSubmit,
}: {
  fileName: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = comment.trim();
          if (!trimmed) {
            toast.error(UI_TOAST_MESSAGES.documents.deleteReasonRequired);
            return;
          }
          onSubmit(trimmed);
        }}
        className="relative w-full max-w-[430px] rounded-[16px] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
      >
        <ModalCloseButton onClick={onClose} disabled={isPending} />

        <h2 className="text-center text-[22px] font-extrabold leading-tight text-[var(--color-blue-dark)]">
          Запросить удаление
        </h2>
        <p className="mt-3 truncate text-center text-[13px] text-[#8D96B5]" title={fileName}>
          {fileName}
        </p>

        <label className="mt-5 block text-[13px] font-extrabold text-[var(--color-blue-dark)]">
          Причина
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            disabled={isPending}
            className="input-design mt-1 min-h-[108px] resize-y py-2"
            placeholder="Почему нужно удалить документ"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn h-[44px] rounded-[10px] border-2 border-[var(--color-blue-dark)] text-[14px] font-extrabold text-[var(--color-blue-dark)]"
          >
            Назад
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn h-[44px] rounded-[10px] bg-[var(--color-danger)] text-[14px] font-extrabold text-white"
          >
            Отправить
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}
