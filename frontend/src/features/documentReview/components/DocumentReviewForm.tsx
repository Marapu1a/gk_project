import { useState } from 'react';
import { useCreateDocReviewReq } from '../hooks/useCreateDocReviewReq';
import { useGetUploadedFiles } from '../hooks/useGetUploadedFiles';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { FileUploader } from './FileUploader';
import { DocumentReviewTable } from './DocumentReviewTable';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';

export function DocumentReviewForm() {
  const [comment, setComment] = useState('');
  const createRequest = useCreateDocReviewReq();
  const { data: files = [] } = useGetUploadedFiles();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      alert('Добавьте хотя бы один файл');
      return;
    }

    const fileIds = files.map((f: { id: any }) => f.id);

    try {
      await createRequest.mutateAsync({ fileIds, comment });

      const moderators = await getModerators(); // Возвращает всех с правами REVIEW или ADMIN

      await Promise.all(
        moderators
          .filter((mod) => mod.role === 'ADMIN') // Жёсткая фильтрация только по ADMIN
          .map((admin) =>
            postNotification({
              userId: admin.id,
              type: 'DOCUMENT',
              message: `Новая заявка на проверку документов от ${user?.email}`,
              link: '/review/documents',
            }),
          ),
      );

      alert('Заявка отправлена');
    } catch (err) {
      console.error('Ошибка при отправке заявки:', err);
      alert('Ошибка при отправке');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 bg-white border rounded shadow max-w-xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-blue-dark">Новая заявка на проверку документов</h1>

      <FileUploader onUploaded={() => {}} />

      {files.length > 0 && <DocumentReviewTable files={files} />}

      <div>
        <label className="block mb-1 font-medium">Комментарий</label>
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

      <BackButton />
    </form>
  );
}
