// src/features/admin/components/EditCertificateModal.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { useUpdateCertificate } from '@/features/admin/hooks/useUpdateCertificate';
import { useDeleteCertificate } from '@/features/certificate/hooks/useDeleteCertificate';
import { FileUpload } from '@/utils/FileUpload';
import { updateFile } from '@/features/files/api/updateFile';

type EditableCertificate = {
  id: string;
  title: string | null;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  file?: { fileId: string; name: string } | null;
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

function toDateInput(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function EditCertificateModal({ userId, certificate, onClose, onUpdated }: Props) {
  const updateMutation = useUpdateCertificate(userId);
  const deleteMutation = useDeleteCertificate(userId);

  const [title, setTitle] = useState(certificate.title ?? '');
  const [number, setNumber] = useState(certificate.number ?? '');
  const [issuedAt, setIssuedAt] = useState(toDateInput(certificate.issuedAt));
  const [expiresAt, setExpiresAt] = useState(toDateInput(certificate.expiresAt));

  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  async function confirm(message: string) {
    return await new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });
  }

  async function handleDeleteCertificate() {
    const ok = await confirm('Отозвать сертификат и удалить файл?');
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(certificate.id);
      toast.success('Сертификат отозван');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось отозвать сертификат');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const payload: any = {
        title: title.trim() || undefined,
        number: number.trim() || undefined,
        issuedAt: new Date(issuedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      };

      if (uploadedFileId) {
        payload.uploadedFileId = uploadedFileId;
      }

      const updated = await updateMutation.mutateAsync({
        certificateId: certificate.id,
        payload,
      });

      toast.success('Сертификат обновлён');

      onUpdated({
        title: updated.title,
        number: updated.number,
        issuedAt: updated.issuedAt,
        expiresAt: updated.expiresAt,
        file: updated.file
          ? { fileId: updated.file.fileId, name: updated.file.name }
          : certificate.file,
      });

      setResetKey((k) => k + 1);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить изменения');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
        <h3 className="text-lg font-semibold text-blue-dark mb-4">Редактирование сертификата</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              className="input"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <FileUpload
            category={`CERTIFICATE_EDIT_${certificate.id}`}
            resetKey={resetKey}
            disabled={isBusy}
            onChange={async (f) => {
              if (!f) {
                setUploadedFileId(null);
                return;
              }
              await updateFile(f.id, 'CERTIFICATE');
              setUploadedFileId(f.id);
            }}
          />

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDeleteCertificate}
              disabled={isBusy}
              className="btn btn-danger"
            >
              Отозвать сертификат
            </button>

            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isBusy}>
                Отмена
              </button>
              <button type="submit" className="btn btn-brand" disabled={isBusy}>
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
