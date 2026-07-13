import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { PageNav } from '@/components/PageNav';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { documentReviewStatusLabels } from '@/utils/documentReviewStatusLabels';
import { getUiErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { formatDateRu as formatDate } from '@/utils/dateFormat';
import { useUserPaymentsById } from '@/features/payment/hooks/useUserPaymentsById';
import {
  DocumentFileCard,
  type ReviewFile,
} from './DocumentFileCard';
import { useGetDocReviewRequestById } from '../hooks/useGetDocReviewRequestById';
import {
  useDeleteDocumentReviewFile,
  useTransferDocumentReviewFileToActiveCycle,
  useUpdateDocumentReviewFile,
} from '../hooks/useUpdateDocumentReviewFile';
import type { DocumentReviewFileStatus } from '../api/updateDocumentReviewFile';
import {
  findPaymentForTarget,
  isDocumentReviewPaymentCovered,
} from '@/features/payment/model/paymentPolicy';

const paymentStatusText: Record<string, string> = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает проверки',
  PAID: 'Оплачено',
};

type RelatedDocumentRequest = {
  id: string;
  status: string;
  submittedAt?: string | null;
  cycleId?: string | null;
  cycle?: { status?: string | null; type?: string | null; targetLevel?: string | null } | null;
  documentFiles?: { id: string; status: string }[];
  _count?: { documents?: number; documentFiles?: number };
};

type ReviewFilesSource = {
  documentFiles?: ReviewFile[] | null;
  documents?: ReviewFile['file'][] | null;
  status?: string | null;
  comment?: string | null;
} | null | undefined;

function normalizeReviewFiles(request: ReviewFilesSource): ReviewFile[] {
  if (!request) return [];

  if (Array.isArray(request?.documentFiles) && request.documentFiles.length > 0) {
    return request.documentFiles;
  }

  return (request?.documents ?? []).map((file) => ({
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

function statusConfirmOptions(status: DocumentReviewFileStatus) {
  if (status === 'CONFIRMED') {
    return {
      message: 'Принять документ?',
      description: '',
      confirmLabel: 'Принять',
    };
  }

  if (status === 'REJECTED') {
    return {
      message: 'Отклонить документ?',
      description: 'Пользователь увидит комментарий администратора.',
      confirmLabel: 'Отклонить',
      variant: 'danger' as const,
    };
  }

  if (status === 'DELETED') {
    return {
      message: 'Удалить файл из хранилища?',
      description: 'Запись останется в заявке со статусом "Удалено".',
      confirmLabel: 'Удалить',
      variant: 'danger' as const,
    };
  }

  return {
    message: 'Изменить статус документа?',
    confirmLabel: 'Подтвердить',
  };
}

function documentRequestArchiveLabel(request: RelatedDocumentRequest) {
  if (!request.cycleId) return 'Старая заявка';
  if (request.cycle?.status && request.cycle.status !== 'ACTIVE') return 'Предыдущая сертификация';
  return 'Текущая сертификация';
}

function documentRequestFilesCount(request: RelatedDocumentRequest) {
  return (
    request._count?.documentFiles || request._count?.documents || request.documentFiles?.length || 0
  );
}

function formatRequestsCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} заявка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} заявки`;
  return `${count} заявок`;
}

export function AdminDocumentReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, error } = useGetDocReviewRequestById(id);
  const updateFile = useUpdateDocumentReviewFile(id);
  const deleteFileRecord = useDeleteDocumentReviewFile(id);
  const transferFile = useTransferDocumentReviewFileToActiveCycle(id);
  const { confirm } = useConfirm();

  const [comments, setComments] = useState<Record<string, string>>({});
  const [types, setTypes] = useState<Record<string, string>>({});
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const { data: payments } = useUserPaymentsById(request?.user?.id);

  const reviewFiles = useMemo(() => normalizeReviewFiles(request), [request]);
  const relatedRequests: RelatedDocumentRequest[] = request?.relatedRequests ?? [];

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

  useEffect(() => {
    setIsArchiveOpen(false);
  }, [id]);

  if (isLoading) return <p className="p-6 text-[var(--color-blue-dark)]">Загрузка...</p>;
  if (error) return <p className="p-6 text-[var(--color-danger)]">Ошибка загрузки</p>;
  if (!request) return <p className="p-6 text-[var(--color-danger)]">Заявка не найдена</p>;

  const isLegacyFallback = reviewFiles.some((item) => item.id.startsWith('legacy-'));
  const isArchiveRequest = !request.cycleId || request.cycle?.status !== 'ACTIVE';
  const activeCycle = request.user?.cycles?.[0] ?? null;
  const requestTitleName =
    request.user?.fullName?.trim() || request.user?.email?.trim() || request.id.slice(0, 6);

  const requestCycleType = request.cycle?.type === 'RENEWAL' ? 'RENEWAL' : 'CERTIFICATION';
  const paymentTargetLevel = request.cycle?.targetLevel ?? activeCycle?.targetLevel;
  const documentPayment = findPaymentForTarget(
    payments ?? [],
    'DOCUMENT_REVIEW',
    paymentTargetLevel,
  );
  const documentReviewPaymentCovered = isDocumentReviewPaymentCovered(
    payments ?? [],
    requestCycleType,
    paymentTargetLevel,
  );

  const handleTypeChange = async (item: ReviewFile, type: string) => {
    setTypes((prev) => ({ ...prev, [item.id]: type }));
    if (item.id.startsWith('legacy-')) return;

    try {
      await updateFile.mutateAsync({
        fileReviewId: item.id,
        payload: { type },
      });
      toast.success(UI_TOAST_MESSAGES.documents.typeUpdated);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.documents.updateFailed));
    }
  };

  const handleStatus = async (item: ReviewFile, status: DocumentReviewFileStatus) => {
    if (item.id.startsWith('legacy-')) {
      toast.info(UI_TOAST_MESSAGES.documents.legacyRecord);
      return;
    }

    const comment = comments[item.id]?.trim() || '';

    if ((status === 'REJECTED' || status === 'DELETED') && !comment) {
      toast.error(UI_TOAST_MESSAGES.documents.adminCommentRequired);
      return;
    }

    const ok = await confirm(statusConfirmOptions(status));
    if (!ok) return;

    try {
      await updateFile.mutateAsync({
        fileReviewId: item.id,
        payload: {
          status,
          type: types[item.id] || item.type || item.file.type || null,
          adminComment: comment || null,
        },
      });
      toast.success(UI_TOAST_MESSAGES.documents.updated);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.documents.updateFailed));
    }
  };

  const handleDeleteForever = async (item: ReviewFile) => {
    if (item.id.startsWith('legacy-')) {
      toast.info(UI_TOAST_MESSAGES.documents.legacyRecord);
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
      toast.success(UI_TOAST_MESSAGES.documents.deletedFromRequest);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.documents.deleteFailed));
    }
  };

  const handleTransferToActiveCycle = async (item: ReviewFile) => {
    const ok = await confirm({
      message: 'Перенести документ в текущую сертификацию?',
      description:
        'Файл появится в заявке текущей сертификации со статусом "На рассмотрении". Старая заявка не изменится.',
      confirmLabel: 'Перенести',
    });

    if (!ok) return;

    try {
      const result = await transferFile.mutateAsync(item.id);
      toast.success(
        result?.alreadyExists
          ? 'Документ уже есть в заявке текущей сертификации.'
          : 'Документ перенесен в текущую сертификацию.',
      );
    } catch (error) {
      toast.error(getUiErrorMessage(error, 'Не удалось перенести документ.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] px-2 py-6 text-[var(--color-blue-dark)] sm:px-4">
      <section className="mx-auto max-w-[1040px] overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <header className="border-b border-[var(--color-blue-soft)] px-6 py-5">
          {/* Мобильная версия — навигация над заголовком */}
          <div className="sm:hidden">
            <PageNav className="mb-3" />
            <h1 className="text-[24px] font-extrabold leading-tight">
              {request.user?.id ? (
                <AdminUserNameLink
                  userId={request.user.id}
                  fullName={request.user.fullName}
                  email={request.user.email}
                >
                  {requestTitleName}
                </AdminUserNameLink>
              ) : (
                requestTitleName
              )}
            </h1>
            <p className="mt-1 text-[13px] text-[#8D96B5]">
              Подана: {formatDate(request.submittedAt)}
            </p>
          </div>

          {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
          <div className="hidden items-center justify-between gap-4 sm:flex">
            <div>
              <h1 className="text-[24px] font-extrabold leading-tight">
                {request.user?.id ? (
                  <AdminUserNameLink
                    userId={request.user.id}
                    fullName={request.user.fullName}
                    email={request.user.email}
                  >
                    {requestTitleName}
                  </AdminUserNameLink>
                ) : (
                  requestTitleName
                )}
              </h1>
              <p className="mt-1 text-[13px] text-[#8D96B5]">
                Подана: {formatDate(request.submittedAt)}
              </p>
            </div>
            <PageNav className="shrink-0" />
          </div>
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
                requestCycleType === 'RENEWAL'
                  ? 'Не требуется'
                  : documentReviewPaymentCovered
                    ? 'Оплачено'
                    : documentPayment
                  ? paymentStatusText[documentPayment.status] || documentPayment.status
                  : 'Нет информации'
              }
            />
            <InfoLine label="Комментарий заявки" value={request.comment || '—'} />
            {requestCycleType === 'RENEWAL' ? (
              <div className="md:col-span-2 rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-[13px]">
                Отдельная оплата проверки документов при ресертификации не требуется.
              </div>
            ) : null}
            {isArchiveRequest ? (
              <div className="md:col-span-2 rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--color-blue-dark)]">
                Это документы из предыдущего периода. Они сохранены для истории и проверки, но не
                подтверждают документы текущей сертификации.
              </div>
            ) : null}
            {isLegacyFallback ? (
              <div className="md:col-span-2 rounded-[10px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] text-[var(--color-danger)]">
                Это старая заявка из прежней версии раздела документов. Она отображается для
                истории, часть действий с отдельными файлами может быть недоступна.
              </div>
            ) : null}
          </section>

          {relatedRequests.length > 0 ? (
            <section className="rounded-[14px] border border-[var(--color-blue-soft)] bg-[#F7F8FA] p-4">
              <button
                type="button"
                className="btn flex w-full items-center justify-between gap-4 text-left text-[var(--color-blue-dark)]"
                onClick={() => setIsArchiveOpen((prev) => !prev)}
              >
                <span>
                  <span className="block text-[18px] font-extrabold">Другие заявки документов</span>
                  <span className="mt-1 block text-[13px] font-semibold text-[#8D96B5]">
                    Есть {formatRequestsCount(relatedRequests.length)}. Они сохранены для истории и
                    не подменяют документы текущей сертификации.
                  </span>
                </span>
                <span className="inline-flex h-8 min-w-[92px] items-center justify-center rounded-full bg-[var(--color-blue-dark)] px-3 text-[13px] font-extrabold text-white">
                  {isArchiveOpen ? 'Скрыть' : 'Показать'}
                </span>
              </button>

              {isArchiveOpen ? (
                <div className="mt-4 space-y-2">
                  {relatedRequests.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-[12px] bg-white px-4 py-3 text-[13px] shadow-[0_1px_8px_rgba(31,48,94,0.06)] md:grid-cols-[130px_minmax(0,1fr)_90px_130px_auto] md:items-center"
                    >
                      <div>
                        <span className="block text-[#8D96B5]">Подана</span>
                        <span className="font-extrabold">{formatDate(item.submittedAt)}</span>
                      </div>
                      <div>
                        <span className="block text-[#8D96B5]">Период</span>
                        <span className="font-semibold">{documentRequestArchiveLabel(item)}</span>
                      </div>
                      <div>
                        <span className="block text-[#8D96B5]">Файлы</span>
                        <span className="font-extrabold">{documentRequestFilesCount(item)}</span>
                      </div>
                      <div>
                        <span className="block text-[#8D96B5]">Статус</span>
                        <span className="font-semibold">
                          {documentReviewStatusLabels[item.status] || item.status}
                        </span>
                      </div>
                      <Link
                        to={`/admin/document-review/${item.id}`}
                        className="btn inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-blue-dark)] px-4 text-[13px] font-extrabold text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-dark)] hover:text-white"
                      >
                        Открыть
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

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
                    actionsDisabled={
                      updateFile.isPending || deleteFileRecord.isPending || transferFile.isPending
                    }
                    canTransfer={isArchiveRequest && item.status !== 'DELETED'}
                    onTypeChange={(type) => handleTypeChange(item, type)}
                    onCommentChange={(comment) =>
                      setComments((prev) => ({ ...prev, [item.id]: comment }))
                    }
                    onStatus={(status) => handleStatus(item, status)}
                    onDeleteForever={() => handleDeleteForever(item)}
                    onTransfer={() => handleTransferToActiveCycle(item)}
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
