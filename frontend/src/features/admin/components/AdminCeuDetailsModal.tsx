import { useState } from 'react';
import { toast } from 'sonner';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { AdminNotifyChoiceModal } from '@/features/admin/components/AdminNotifyChoiceModal';
import type { AdminCeuHistoryRow } from '@/features/admin/api/ceu/getAdminCeuHistory';
import { useDeleteCEURecord, useUpdateCEUEntry } from '@/features/ceu/hooks/useUpdateCeuEntry';
import { displayCeuEventName } from '@/features/ceu/utils/displayCeuEventName';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';
import { formatDateRu as formatDate, formatDateTimeRu as formatDateTime } from '@/utils/dateFormat';
import { getUiErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';

export function AdminCeuDetailsModal({
  row,
  onClose,
}: {
  row: AdminCeuHistoryRow;
  onClose: () => void;
}) {
  const mutation = useUpdateCEUEntry(row.userId, row.email);
  const deleteMutation = useDeleteCEURecord(row.userId, row.email);
  const { confirm: confirmDialog } = useConfirm();
  const [rejectedReason, setRejectedReason] = useState(row.rejectedReason ?? '');
  const [deleteFile, setDeleteFile] = useState(false);
  const [pendingAction, setPendingAction] = useState<'CONFIRM' | 'REJECT' | null>(null);
  const isBrokenRecord = row.entries.length === 0;
  const isSpent = row.status === 'SPENT';
  const canConfirm = !isBrokenRecord && row.status === 'REJECTED';
  const canReject = !isBrokenRecord && !isSpent && !canConfirm;
  const isActionPending = mutation.isPending || deleteMutation.isPending;

  const requestConfirm = () => {
    setPendingAction('CONFIRM');
  };

  const requestReject = () => {
    const reason = rejectedReason.trim();
    if (!reason) {
      toast.error(UI_TOAST_MESSAGES.ceu.rejectReasonRequired);
      return;
    }
    setPendingAction('REJECT');
  };

  const confirm = async (notifyUser: boolean) => {
    try {
      await mutation.mutateAsync({ id: row.entryId, status: 'CONFIRMED', notifyUser });
      toast.success(UI_TOAST_MESSAGES.ceu.confirmed);
      setPendingAction(null);
      onClose();
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.ceu.confirmFailed));
    }
  };

  const reject = async (notifyUser: boolean) => {
    const reason = rejectedReason.trim();
    if (!reason) {
      toast.error(UI_TOAST_MESSAGES.ceu.rejectReasonRequired);
      return;
    }

    try {
      await mutation.mutateAsync({
        id: row.entryId,
        status: 'REJECTED',
        rejectedReason: reason,
        deleteFile,
        notifyUser,
      });
      toast.success(
        deleteFile
          ? UI_TOAST_MESSAGES.ceu.rejectedWithFileDeleted
          : UI_TOAST_MESSAGES.ceu.rejected,
      );
      setPendingAction(null);
      onClose();
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.ceu.rejectFailed));
    }
  };

  const removeBrokenRecord = async () => {
    const ok = await confirmDialog({
      title: 'Удалить CEU-запись?',
      message:
        'Запись будет удалена полностью. Если к ней прикреплен файл и он не используется в других местах, файл тоже будет удален.',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(row.recordId);
      toast.success(UI_TOAST_MESSAGES.ceu.recordDeleted);
      onClose();
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.ceu.deleteRecordFailed));
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabelledBy="admin-ceu-details-title"
      dialogClassName="relative max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
    >
      <ModalCloseButton onClick={onClose} />

      <h3
        id="admin-ceu-details-title"
        className="dashboard-v2-page-title mb-5 text-center"
      >
        Детали CEU
      </h3>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Всего баллов" value={formatNumber(row.points)} />
            <ReadOnlyField label="Дата мероприятия" value={formatDate(row.eventDate)} />
          </div>

          <div>
            <div className="dashboard-v2-small mb-2 font-semibold text-[#1F305E]">
              Начисленные баллы
            </div>
            <div className="overflow-hidden rounded-[10px] border border-[#DCE8EC]">
              {row.entries.length > 0 ? (
                row.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 gap-3 border-b border-[#DCE8EC] px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,190px)_48px_minmax(0,1fr)]"
                >
                  <span className="dashboard-v2-small min-w-0 break-words pr-2 font-semibold leading-[1.25] text-[#1F305E]">
                    {ceuCategoryLabels[entry.category] ?? entry.category}
                  </span>
                  <span className="dashboard-v2-small font-extrabold text-[#1F305E]">
                    {formatNumber(entry.value)}
                  </span>
                  <span className="dashboard-v2-caption leading-snug text-[#6B7894]">
                    {entry.activityType ? activityTypeLabel(entry.activityType) : '-'}
                  </span>
                </div>
                ))
              ) : (
                <div className="dashboard-v2-text bg-[#FFF1F3] px-4 py-4 text-[var(--color-danger)]">
                  В записи нет начисленных CEU-баллов. Это служебно поврежденная запись, ее
                  можно удалить полностью.
                </div>
              )}
            </div>
          </div>

          <AdminCeuFilePreview file={row.file} />
        </div>

        <div className="space-y-5">
          <ReadOnlyField
            label="Название или ведущий тренинга"
            value={displayCeuEventName(row.eventName)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyPlain label="Специалист" value={row.fullName || '-'} mutedLabel />
            <ReadOnlyPlain label="Email" value={row.email || '-'} mutedLabel />
          </div>

          <ReadOnlyPlain label="Цикл" value={row.cycleLabel || '-'} mutedLabel />

          <div className="rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-center dashboard-v2-label text-[#1F305E]">
            {recordStatusLabels[row.status] ?? row.status}
          </div>

          {row.reviewer ? (
            <div className="dashboard-v2-caption text-[#8D96B5]">
              Проверил: {row.reviewer.email}
              {row.reviewedAt ? `, ${formatDateTime(row.reviewedAt)}` : ''}
            </div>
          ) : null}

          {row.rejectedReason && !canReject ? (
            <div className="dashboard-v2-text rounded-[10px] bg-white px-4 py-3 text-[var(--color-danger)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              {row.rejectedReason}
            </div>
          ) : null}

          {canReject ? (
            <div className="space-y-4">
              <label className="block">
                <span className="dashboard-v2-small mb-1 block text-[#1F305E]">
                  Причина отклонения
                </span>
                <textarea
                  className="input-design min-h-[96px] resize-y"
                  value={rejectedReason}
                  onChange={(event) => setRejectedReason(event.target.value)}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder="Например: прикреплён неверный сертификат"
                />
              </label>

              {row.file ? (
                <label className="dashboard-v2-caption flex cursor-pointer items-center gap-2 text-[#1F305E]">
                  <input
                    type="checkbox"
                    checked={deleteFile}
                    onChange={(event) => setDeleteFile(event.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                  Удалить файл у всей заявки CEU
                </label>
              ) : null}
              {deleteFile ? (
                <p className="dashboard-v2-caption text-[#8D96B5]">
                  Вся заявка будет отклонена с этим комментарием, потому что файл общий.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {!isSpent ? (
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {isBrokenRecord ? (
            <button
              type="button"
              onClick={removeBrokenRecord}
              disabled={isActionPending}
              className="btn btn-outline dashboard-v2-label h-[42px] min-w-[190px] rounded-full border-[var(--color-danger)] px-6 text-[var(--color-danger)] disabled:opacity-60"
            >
              Удалить запись полностью
            </button>
          ) : canConfirm ? (
            <button
              type="button"
              onClick={requestConfirm}
              disabled={isActionPending}
              className="btn btn-dark dashboard-v2-label h-[42px] min-w-[140px] rounded-full px-6 disabled:bg-[#B7BFCE]"
            >
              Подтвердить
            </button>
          ) : (
            <button
              type="button"
              onClick={requestReject}
              disabled={isActionPending}
              className="btn btn-dark dashboard-v2-label h-[42px] min-w-[150px] rounded-full px-6 disabled:bg-[#B7BFCE]"
            >
              Отклонить как ошибочную
            </button>
          )}
        </div>
      ) : null}

      {pendingAction ? (
        <AdminNotifyChoiceModal
          title={
            pendingAction === 'CONFIRM'
              ? 'Подтвердить CEU-баллы?'
              : deleteFile
                ? 'Отклонить CEU и удалить файл?'
                : 'Отклонить CEU как ошибочную?'
          }
          message="Отправить пользователю уведомление об этом действии?"
          danger={pendingAction === 'REJECT'}
          isPending={mutation.isPending}
          onClose={() => setPendingAction(null)}
          onChoose={(notify) =>
            pendingAction === 'CONFIRM' ? void confirm(notify) : void reject(notify)
          }
        />
      ) : null}
    </ModalShell>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function activityTypeLabel(value: string) {
  const labels: Record<string, string> = {
    TRAINING_ATTENDANCE:
      'Участие в онлайн- или очных семинарах, воркшопах и тренингах по прикладному анализу поведения (ПАП) или смежным направлениям поведенческого анализа',
    PRESENTATION:
      'Проведение семинара, воркшопа или тренинга по прикладному анализу поведения (ПАП) или смежным направлениям',
    PUBLICATION:
      'Публикация материалов по прикладному анализу поведения или смежным направлениям',
    TEACHING:
      'Преподавание курсов, соответствующих содержательным требованиям и компетенциям уровней Инструктор/Супервизор',
  };
  return labels[value] ?? value;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dashboard-v2-small mb-1 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-caption min-h-[32px] rounded-[8px] bg-[#EFF1F5] px-3 py-2 text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function ReadOnlyPlain({
  label,
  value,
  mutedLabel = false,
}: {
  label: string;
  value: string;
  mutedLabel?: boolean;
}) {
  return (
    <div>
      <div className={`dashboard-v2-small mb-1 ${mutedLabel ? 'text-[#A7B1C7]' : 'text-[#1F305E]'}`}>
        {label}
      </div>
      <div className="dashboard-v2-caption leading-snug text-[#1F305E]">{value}</div>
    </div>
  );
}

function AdminCeuFilePreview({ file }: { file: AdminCeuHistoryRow['file'] }) {
  if (!file) {
    return (
      <div className="dashboard-v2-caption rounded-[10px] bg-white px-4 py-5 text-[#6B7894] shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        Файл не прикреплён
      </div>
    );
  }

  const fileUrl = `/uploads/${file.fileId}`;
  const isImage = file.mimeType.startsWith('image/');

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-4 rounded-[10px] bg-white px-3 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[4px] border border-[#DCE3EF] bg-white dashboard-v2-caption font-bold text-[#A7B1C7]">
        {isImage ? (
          <img src={fileUrl} alt="" className="h-full w-full rounded-[4px] object-cover" />
        ) : (
          'PDF'
        )}
      </div>
      <div className="dashboard-v2-caption min-w-0 truncate text-[#1F305E]" title={file.name}>
        {file.name}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="btn dashboard-v2-caption h-[34px] rounded-full border border-[#1F305E] px-4 font-semibold text-[#1F305E]"
      >
        Открыть
      </a>
    </div>
  );
}
