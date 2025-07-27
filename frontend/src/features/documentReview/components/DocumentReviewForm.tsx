import { useState } from 'react';
import { useCreateDocReviewReq } from '../hooks/useCreateDocReviewReq';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import { MultiFileUpload, type UploadedFile } from '@/utils/MultiFileUpload';

export function DocumentReviewForm() {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const createRequest = useCreateDocReviewReq();

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

    if (files.some((f) => !f.type)) {
      alert('У всех файлов должен быть выбран тип документа');
      return;
    }

    const fileIds = files.map((f) => f.id);

    try {
      await createRequest.mutateAsync({ fileIds, comment });

      const moderators = await getModerators();

      await Promise.all(
        moderators.map((mod) =>
          postNotification({
            userId: mod.id,
            type: 'DOCUMENT',
            message: `Новая заявка на проверку документов от ${user.email}`,
            link: '/admin/document-review',
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

      <MultiFileUpload onChange={setFiles} />

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
