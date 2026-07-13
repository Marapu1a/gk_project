import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useCreateDocReviewReq } from '../hooks/useCreateDocReviewReq';
import { useUpdateFileType } from '../hooks/useUpdateFileType';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { StatusPill } from '@/components/StatusPill';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const MAX_FILES = 10;
const MAX_SIZE_MB = 10;

type UploadedDocument = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  type?: DocumentType | null;
};

type Props = {
  paymentStatusLabel: string;
  isDocumentReviewPaid: boolean;
  onCollapse: () => void;
};

export function DocumentReviewForm({ paymentStatusLabel, isDocumentReviewPaid, onCollapse }: Props) {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const createRequest = useCreateDocReviewReq();
  const updateFileType = useUpdateFileType();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const saveType = async (fileId: string, type: DocumentType) => {
    const previousType = files.find((file) => file.id === fileId)?.type;

    setFiles((current) =>
      current.map((file) => (file.id === fileId ? { ...file, type } : file)),
    );

    try {
      await updateFileType.mutateAsync({ fileId, type });
    } catch {
      setFiles((current) =>
        current.map((file) =>
          file.id === fileId && file.type === type
            ? { ...file, type: previousType }
            : file,
        ),
      );
      toast.error(UI_TOAST_MESSAGES.documents.updateFailed);
    }
  };

  const removeFile = async (fileId: string) => {
    const ok = await confirm({
      message: 'Удалить файл?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteFile(fileId);
      toast.success(UI_TOAST_MESSAGES.files.fileDeleted);
    } catch {
      toast.info(UI_TOAST_MESSAGES.files.physicalDeleteFailed);
    } finally {
      setFiles((current) => current.filter((file) => file.id !== fileId));
    }
  };

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || uploading) return;

    const availableSlots = MAX_FILES - files.length;
    if (availableSlots <= 0) {
      toast.error(UI_TOAST_MESSAGES.files.maxFiles(MAX_FILES));
      return;
    }

    const nextFiles = accepted.slice(0, availableSlots);
    const oversized = nextFiles.find((file) => file.size > MAX_SIZE_MB * 1024 * 1024);

    if (oversized) {
      toast.error(UI_TOAST_MESSAGES.files.tooLarge(MAX_SIZE_MB));
      return;
    }

    setUploading(true);

    try {
      const uploaded: UploadedDocument[] = [];

      for (const file of nextFiles) {
        uploaded.push(await uploadFile(file, 'documents'));
      }

      setFiles((current) => [...current, ...uploaded]);
      toast.success(
        uploaded.length === 1 ? UI_TOAST_MESSAGES.files.fileUploaded : UI_TOAST_MESSAGES.files.filesUploaded,
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        (err?.response?.status === 413
          ? UI_TOAST_MESSAGES.files.tooLarge(MAX_SIZE_MB)
          : UI_TOAST_MESSAGES.files.uploadFailed);

      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: true,
    maxFiles: MAX_FILES,
    accept: {
      'application/pdf': [],
      'image/jpeg': [],
      'image/png': [],
    },
    disabled: uploading || files.length >= MAX_FILES,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!files.length) {
      toast.error(UI_TOAST_MESSAGES.documents.noFilesSelected);
      return;
    }

    if (files.some((file) => !file.type)) {
      toast.error(UI_TOAST_MESSAGES.documents.fileTypeRequired);
      return;
    }

    try {
      await createRequest.mutateAsync({
        documents: files.map((file) => ({
          fileId: file.id,
          type: file.type as DocumentType,
        })),
        comment,
      });

      toast.success(UI_TOAST_MESSAGES.documents.requestSent);
      setFiles([]);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['docReviewReq'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || UI_TOAST_MESSAGES.files.uploadFailed);
    }
  };

  const submitDisabled =
    createRequest.isPending ||
    uploading ||
    files.length === 0 ||
    files.some((file) => !file.type);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-[18px] bg-white px-6 py-5 shadow-soft"
    >
      <div className="mb-4 text-center">
        <button
          type="button"
          onClick={onCollapse}
          className="mx-auto flex items-center gap-2 text-[18px] font-extrabold leading-tight text-[var(--color-blue-dark)]"
        >
          Загрузить
          <img
            src="/dashboard-v2/btn_hide.svg"
            alt=""
            className="h-[21px] w-[21px] cursor-pointer"
          />
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-[#8D96B5]">
          <span>Оплата:</span>
          <StatusPill
            tone={isDocumentReviewPaid ? 'info' : 'danger'}
            size="custom"
            className="h-[24px] px-3 text-[12px] font-extrabold"
          >
            {paymentStatusLabel}
          </StatusPill>
        </div>
        {!isDocumentReviewPaid ? (
          <p className="mt-2 text-[12px] font-semibold text-[var(--color-danger)]">
            Проверка после оплаты экспертизы.
          </p>
        ) : null}
      </div>

      <div
        {...getRootProps()}
        className={`flex min-h-[106px] cursor-pointer items-center justify-center rounded-[4px] border-2 border-dashed border-[#B8C4D8] px-4 py-6 text-center text-[13px] leading-[1.35] text-[#A7B1C7] transition ${
          uploading || files.length >= MAX_FILES ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#F7F8FA]'
        }`}
      >
        <input {...getInputProps()} />
        {uploading
          ? 'Загрузка...'
          : isDragActive
            ? 'Отпустите файлы здесь'
            : `Выберите или перетащите до ${MAX_FILES} файлов\nPDF, JPG, PNG`}
      </div>

      {files.length > 0 ? (
        <div className="mt-4 space-y-3">
          {files.map((file) => (
            <DocumentUploadRow
              key={file.id}
              file={file}
              disabled={uploading || createRequest.isPending || updateFileType.isPending}
              onTypeChange={(type) => saveType(file.id, type)}
              onDelete={() => removeFile(file.id)}
            />
          ))}
        </div>
      ) : null}

      <label className="mt-4 block text-[13px] font-extrabold text-[var(--color-blue-dark)]">
        Комментарий
        <input
          type="text"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Необязательно"
          className="input-design mt-1 h-[34px]"
        />
      </label>

      <button
        type="submit"
        disabled={submitDisabled}
        className="btn mt-5 h-[52px] w-full rounded-[10px] bg-[var(--color-blue-dark)] text-[15px] font-extrabold text-white disabled:bg-[#B8C0D1]"
      >
        {createRequest.isPending ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}

function DocumentUploadRow({
  file,
  disabled,
  onTypeChange,
  onDelete,
}: {
  file: UploadedDocument;
  disabled: boolean;
  onTypeChange: (type: DocumentType) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[10px] bg-white p-3 shadow-[0_2px_10px_rgba(31,48,94,0.10)] sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
      <FilePreview file={file} />

      <div className="min-w-0">
        <p className="truncate text-[13px] text-[#222]" title={file.name}>
          {file.name}
        </p>
        <select
          value={file.type ?? ''}
          onChange={(event) => onTypeChange(event.target.value as DocumentType)}
          disabled={disabled}
          className="input-design mt-2 h-[30px] max-w-[220px] py-0 text-[13px]"
        >
          <option value="">Выберите тип</option>
          {Object.entries(documentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`/uploads/${file.fileId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn h-[34px] rounded-full border border-[#A7B1C7] px-4 text-[13px] font-semibold text-[var(--color-blue-dark)]"
        >
          Открыть
        </a>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#A7B1C7] disabled:cursor-not-allowed disabled:opacity-45"
          title="Удалить файл"
          aria-label="Удалить файл"
        >
          <img src={EXIT_ICON} alt="" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: UploadedDocument }) {
  if (file.mimeType.startsWith('image/')) {
    return (
      <img
        src={`/uploads/${file.fileId}`}
        alt=""
        className="h-[64px] w-[64px] rounded-[4px] border border-[#C9D2E2] object-cover"
      />
    );
  }

  return (
    <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[4px] border border-[#C9D2E2] bg-[#F7F8FA] text-[12px] font-extrabold text-[#8D96B5]">
      {file.mimeType === 'application/pdf' ? 'PDF' : 'FILE'}
    </div>
  );
}
