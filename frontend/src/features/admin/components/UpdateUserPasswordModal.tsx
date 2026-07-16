// src/features/admin/components/UpdateUserPasswordModal.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { getUiErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';
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
      toast.error(UI_TOAST_MESSAGES.admin.passwordMinLength);
      return;
    }

    try {
      await mutation.mutateAsync({ password });
      toast.success(UI_TOAST_MESSAGES.admin.passwordChanged);
      onClose();
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.admin.passwordChangeFailed));
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabelledBy="update-user-password-title"
      overlayClassName="z-50 bg-black/30 px-4"
      dialogClassName="relative w-full max-w-sm rounded-2xl bg-white p-4 pt-5 header-shadow"
    >
      <ModalCloseButton onClick={onClose} disabled={mutation.isPending} />

      <h3 id="update-user-password-title" className="mb-3 text-lg font-semibold text-blue-dark">
        Смена пароля
      </h3>

      <input
        type="password"
        className="input w-full"
        placeholder="Введите новый пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={mutation.isPending}
      />

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-brand" onClick={onSave} disabled={mutation.isPending}>
          Сохранить
        </button>
      </div>
    </ModalShell>
  );
}
