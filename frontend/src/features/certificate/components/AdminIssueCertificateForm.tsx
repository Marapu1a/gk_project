// src/features/certificate/features/AdminIssueCertificateForm.tsx
import { useState } from 'react';
import { useIssueCertificate } from '../hooks/useIssueCertificate';
import { Button } from '@/components/Button';
import { FileUpload } from '@/utils/FileUpload';
import { updateFile } from '@/features/files/api/updateFile';
import { toast } from 'sonner';

type Props = {
  defaultEmail?: string;
  onSuccess?: () => void;
};

export function AdminIssueCertificateForm({ defaultEmail = '', onSuccess }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState(''); // yyyy-mm-dd
  const [expiresDate, setExpiresDate] = useState(''); // yyyy-mm-dd
  const [uploadedFileId, setUploadedFileId] = useState<string>('');
  const [resetKey, setResetKey] = useState(0); // чтобы сбрасывать FileUpload/превью

  const mutation = useIssueCertificate();

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  function toISOStartOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toISOString();
  }

  function toISOEndOfDay(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T23:59:59');
    return d.toISOString();
  }

  const canSubmit =
    !!email.trim() &&
    !!title.trim() &&
    !!number.trim() &&
    !!issuedDate &&
    !!expiresDate &&
    !!uploadedFileId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || mutation.isPending) return;

    if (!(await confirmToast('Выдать сертификат этому пользователю?'))) return;

    try {
      await mutation.mutateAsync({
        email: email.trim(),
        title: title.trim(),
        number: number.trim(),
        issuedAt: toISOStartOfDay(issuedDate),
        expiresAt: toISOEndOfDay(expiresDate),
        uploadedFileId,
      });

      toast.success('Сертификат выдан');

      // Сброс формы + скрываем превью (ремоунт FileUpload)
      setTitle('');
      setNumber('');
      setIssuedDate('');
      setExpiresDate('');
      setUploadedFileId('');
      setResetKey((k) => k + 1);

      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Не удалось выдать сертификат';
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-blue-dark mb-1">Email пользователя</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">
            Название сертификата
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Напр. Инструктор"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">Номер</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="input"
            placeholder="Напр. 2025-001"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">Дата выдачи</label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-dark mb-1">
            Действует до (дата)
          </label>
          <input
            type="date"
            value={expiresDate}
            onChange={(e) => setExpiresDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-blue-dark mb-1">Файл сертификата</label>
        <FileUpload
          resetKey={resetKey}
          category="CERTIFICATE"
          disabled={mutation.isPending}
          onChange={async (f) => {
            if (!f) {
              setUploadedFileId('');
              return;
            }
            try {
              // помечаем файл как сертификат
              await updateFile(f.id, 'CERTIFICATE');
            } catch {
              toast.info('Файл загружен, но не удалось обновить метаданные.');
            }
            setUploadedFileId(f.id);
          }}
        />
        {!uploadedFileId && (
          <p className="text-xs text-gray-500 mt-1">Загрузите PDF/изображение сертификата.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? 'Выдаю…' : 'Выдать сертификат'}
        </Button>
      </div>
    </form>
  );
}
