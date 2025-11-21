// src/features/admin/components/UpdateUserPasswordModal.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { useUpdateUserPassword } from '../hooks/useUpdateUserPassword';

type Props = {
  userId: string;
  onClose: () => void;
};

export function UpdateUserPasswordModal({ userId, onClose }: Props) {
  const mutation = useUpdateUserPassword(userId);
  const [password, setPassword] = useState('');

  const onSave = async () => {
    if (password.length < 6) {
      toast.error('Минимум 6 символов');
      return;
    }

    try {
      await mutation.mutateAsync({ password });
      toast.success('Пароль изменён');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка смены пароля');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm header-shadow">
        <h3 className="text-lg font-semibold mb-3 text-blue-dark">Смена пароля</h3>

        <input
          type="password"
          className="input w-full"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={mutation.isPending}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </button>
          <button className="btn btn-brand" onClick={onSave} disabled={mutation.isPending}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
