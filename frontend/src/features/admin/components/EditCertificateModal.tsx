// src/features/admin/components/EditCertificateModal.tsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useUpdateCertificate } from '@/features/admin/hooks/useUpdateCertificate';
import { useDeleteCertificate } from '@/features/certificate/hooks/useDeleteCertificate';
import { updateFile } from '@/features/files/api/updateFile';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { toCertificateDateInputValue } from '@/features/certificate/utils/certificateDates';
import { getUiErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const MAX_CERTIFICATE_FILE_MB = 20;
const CERTIFICATE_NUMBER_PREFIX = 'РОСС RU.04ЦВА0.';

const normalizeCertificateNumberSuffix = (value: string) =>
  value.replace(/[^\d.]/g, '').slice(0, 8);

type EditableCertificate = {
  id: string;
  title: string | null;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  file?: { fileId: string; name: string } | null;
  group?: { id: string; name: string } | null;
};

type Props = {
  userId: string;
  certificate: EditableCertificate;
  onClose: () => void;
  onUpdated: (cert: {
    title: string;
    number: string;
    issuedAt: string;
    expiresAt: string;
    file?: { fileId: string; name: string } | null;
  }) => void;
};

type UploadedCertificateFile = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
};

function getCertificateNumberSuffix(number: string | null) {
  if (!number) return '';
  return number.startsWith(CERTIFICATE_NUMBER_PREFIX)
    ? number.slice(CERTIFICATE_NUMBER_PREFIX.length)
    : number;
}

export function EditCertificateModal({ userId, certificate, onClose, onUpdated }: Props) {
  const updateMutation = useUpdateCertificate(userId);
  const deleteMutation = useDeleteCertificate(userId);
  const { confirm } = useConfirm();

  const [title, setTitle] = useState(certificate.title ?? '');
  const [numberSuffix, setNumberSuffix] = useState(getCertificateNumberSuffix(certificate.number));
  const [issuedAt, setIssuedAt] = useState(toCertificateDateInputValue(certificate.issuedAt));
  const [expiresAt, setExpiresAt] = useState(toCertificateDateInputValue(certificate.expiresAt));

  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedCertificateFile | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const isBusy = updateMutation.isPending || deleteMutation.isPending || isUploadingFile;
  const currentFile = uploadedFile ?? certificate.file ?? null;
  const canSubmit = Boolean(title.trim() && numberSuffix.trim() && issuedAt && expiresAt);

  async function handleDeleteCertificate() {
    const ok = await confirm({
      message: 'Отозвать сертификат и удалить файл?',
      confirmLabel: 'Отозвать',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(certificate.id);
      toast.success(UI_TOAST_MESSAGES.certificate.revoked);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.certificate.revokeFailed);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const payload: any = {
        title: title.trim() || undefined,
        number: `${CERTIFICATE_NUMBER_PREFIX}${numberSuffix.trim()}`,
        issuedAt,
        expiresAt,
      };

      if (uploadedFileId) {
        payload.uploadedFileId = uploadedFileId;
      }

      const updated = await updateMutation.mutateAsync({
        certificateId: certificate.id,
        payload,
      });

      toast.success(UI_TOAST_MESSAGES.certificate.updated);

      onUpdated({
        title: updated.title,
        number: updated.number,
        issuedAt: updated.issuedAt,
        expiresAt: updated.expiresAt,
        file: updated.file
          ? { fileId: updated.file.fileId, name: updated.file.name }
          : certificate.file,
      });

      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.certificate.updateFailed);
    }
  }

  const handlePdfDrop = async (accepted: File[]) => {
    const file = accepted[0];
    if (!file || isBusy) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.trim().toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      toast.error(UI_TOAST_MESSAGES.files.pdfOnly);
      return;
    }

    if (file.size > MAX_CERTIFICATE_FILE_MB * 1024 * 1024) {
      toast.error(UI_TOAST_MESSAGES.files.tooLarge(MAX_CERTIFICATE_FILE_MB));
      return;
    }

    setIsUploadingFile(true);
    try {
      if (uploadedFile?.id) {
        try {
          await deleteFile(uploadedFile.id);
        } catch {
          // Не блокируем замену, если временный файл уже недоступен.
        }
      }

      const uploaded = (await uploadFile(file, 'CERTIFICATE')) as UploadedCertificateFile;

      try {
        await updateFile(uploaded.id, 'CERTIFICATE');
      } catch {
        toast.info(UI_TOAST_MESSAGES.certificate.fileMetadataWarning);
      }

      setUploadedFile(uploaded);
      setUploadedFileId(uploaded.id);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.certificate.uploadFailed));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteUploadedFile = async () => {
    if (!uploadedFile || isBusy) return;

    try {
      await deleteFile(uploadedFile.id);
      setUploadedFile(null);
      setUploadedFileId(null);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.certificate.deleteFileFailed));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handlePdfDrop,
    onDropRejected: () => toast.error(UI_TOAST_MESSAGES.files.pdfOnly),
    multiple: false,
    accept: { 'application/pdf': ['.pdf'] },
    disabled: isBusy,
  });

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabelledBy="edit-certificate-title"
      overlayClassName="z-50 bg-black/40 px-4"
      dialogClassName="relative max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[18px] bg-white p-6 shadow-xl"
    >
        <ModalCloseButton onClick={onClose} disabled={isBusy} />

        <h3 id="edit-certificate-title" className="mb-5 text-center text-[22px] font-bold text-[var(--color-blue-dark)]">
          Редактирование сертификата
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="dashboard-v2-label mb-1 block">Уровень сертификата</label>
              <input
                className="input-design h-[32px] bg-[#F7F9FB]"
                value={certificate.group?.name ?? '—'}
                disabled
              />
            </div>

            <div>
              <label className="dashboard-v2-label mb-1 block">Название сертификата</label>
              <input
                className="input-design h-[32px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="dashboard-v2-label mb-1 block">Номер сертификата</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="dashboard-v2-label mb-1 block">Дата выдачи</label>
                <input
                  type="date"
                  className="input-design h-[32px]"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="dashboard-v2-label mb-1 block">Действителен до</label>
                <input
                  type="date"
                  className="input-design h-[32px]"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-7">
            <label className="mb-1 block text-center text-[13px] font-semibold text-[var(--color-blue-dark)]">
              Сертификат
            </label>

            <div
              {...getRootProps()}
              className={`flex min-h-[104px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed border-[#B8C4D8] px-5 text-center text-[14px] text-[#A7B1C7] transition hover:bg-[#F7F9FB] ${
                isBusy ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <input {...getInputProps()} />
              {isUploadingFile
                ? 'Загрузка...'
                : isDragActive
                  ? 'Отпустите PDF здесь'
                  : uploadedFile
                    ? 'Файл загружен. Можно заменить другим PDF'
                    : 'Выберите или перетащите новый PDF, если нужно заменить файл'}
            </div>

            {currentFile ? (
              <div className="mt-3 flex items-center gap-3 rounded-[10px] bg-white p-3 shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                <div className="h-[76px] w-[60px] shrink-0 rounded-[4px] border border-[#C9D2E2] bg-white" />
                <div className="min-w-0 flex-1 truncate text-[13px] text-[#222]">
                  {currentFile.name}
                </div>
                <a
                  href={`/uploads/${currentFile.fileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn h-[28px] rounded-full border border-[var(--color-blue-dark)] px-3 text-[12px] font-semibold text-[var(--color-blue-dark)]"
                >
                  Открыть
                </a>
                {uploadedFile ? (
                  <button
                    type="button"
                    onClick={handleDeleteUploadedFile}
                    disabled={isBusy}
                    className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#B8C4D8] opacity-70 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Убрать новый файл сертификата"
                  >
                    <img src={EXIT_ICON} alt="" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDeleteCertificate}
              disabled={isBusy}
              className="btn dashboard-v2-action dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)]"
            >
              Отозвать сертификат
            </button>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn dashboard-v2-action dashboard-v2-action-secondary"
                onClick={onClose}
                disabled={isBusy}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn dashboard-v2-action dashboard-v2-action-primary"
                disabled={isBusy || !canSubmit}
              >
                {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
    </ModalShell>
  );
}
