// src/features/documentReview/components/DocumentReviewForm.tsx
import { useState } from 'react';
import { useCreateDocReviewReq } from '../hooks/useCreateDocReviewReq';
import { Button } from '@/components/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import { MultiFileUpload, type UploadedFile } from '@/utils/MultiFileUpload';
import { toast } from 'sonner';

type Props = { lastAdminComment?: string };

export function DocumentReviewForm({ lastAdminComment }: Props) {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const createRequest = useCreateDocReviewReq();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAdminUser = () => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: ['admin', 'user', user.id] });
  };

  const handleFilesChange = (list: UploadedFile[]) => {
    setFiles(list);
    invalidateAdminUser();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error('Добавьте хотя бы один файл.');
      return;
    }
    if (files.some((f) => !f.type)) {
      toast.error('У каждого файла должен быть выбран тип документа.');
      return;
    }

    const fileIds = files.map((f) => f.id);

    try {
      await createRequest.mutateAsync({ fileIds, comment });

      // notify only ADMINS (фронтовая фильтрация)
      try {
        const moderators = await getModerators();
        const admins = moderators
          .filter((m: any) => String(m.role).toUpperCase() === 'ADMIN')
          .filter((m: any, i: number, a: any[]) => a.findIndex((x) => x.id === m.id) === i) // dedupe
          .filter((m: any) => m.id !== user?.id); // не шлём себе

        if (admins.length) {
          await Promise.allSettled(
            admins.map((m: any) =>
              postNotification({
                userId: m.id,
                type: 'DOCUMENT',
                message: `Новая заявка на проверку документов от ${user?.email ?? 'пользователя'}`,
                link: '/admin/document-review',
              }),
            ),
          );
        }
      } catch {
        toast.info('Заявка отправлена, но не все уведомления ушли.');
      }

      invalidateAdminUser();
      toast.success('Заявка отправлена');
      setComment('');
      setFiles([]);
      localStorage.removeItem('files:documents');
      setResetKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка при отправке');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {lastAdminComment && (
        <div
          className="p-3 rounded border bg-yellow-50 text-sm"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div className="font-medium mb-1">Комментарий модератора к предыдущей заявке:</div>
          <div>{lastAdminComment}</div>
        </div>
      )}

      <MultiFileUpload key={resetKey} onChange={handleFilesChange} />

      <div>
        <label className="block mb-1 font-medium text-blue-dark">Комментарий</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий к заявке (необязательно)"
          className="input"
        />
      </div>

      <Button type="submit" loading={createRequest.isPending} className="w-full">
        Отправить заявку
      </Button>
    </form>
  );
}
