import { useState } from 'react';
import { useCreateDocReviewReq } from '../hooks/useCreateDocReviewReq';
import { useGetUploadedFiles } from '../hooks/useGetUploadedFiles';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { FileUploader } from './FileUploader';
import { DocumentReviewTable } from './DocumentReviewTable';

export function DocumentReviewForm() {
  const [comment, setComment] = useState('');
  const createRequest = useCreateDocReviewReq();
  const { data: files = [] } = useGetUploadedFiles();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      alert('Добавьте хотя бы один файл');
      return;
    }

    const fileIds = files.map((f: { id: any }) => f.id);

    createRequest.mutate({ fileIds, comment });
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
