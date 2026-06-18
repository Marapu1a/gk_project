import { ModalCloseButton } from '@/components/ModalCloseButton';

type Props = {
  title: string;
  message?: string;
  isPending?: boolean;
  danger?: boolean;
  onChoose: (notify: boolean) => void;
  onClose: () => void;
};

export function AdminNotifyChoiceModal({
  title,
  message = 'Отправить пользователю уведомление об этом действии?',
  isPending,
  danger,
  onChoose,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
      <div className="relative w-full max-w-[520px] rounded-[20px] bg-white p-5 pr-14 text-[var(--color-blue-dark)] shadow-soft">
        <ModalCloseButton onClick={onClose} disabled={isPending} />
        <h3 className="dashboard-v2-title">{title}</h3>
        <p className="mt-3 dashboard-v2-text">{message}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="btn dashboard-v2-action dashboard-v2-action-secondary"
            onClick={() => onChoose(false)}
            disabled={isPending}
          >
            Без уведомления
          </button>
          <button
            type="button"
            className={`btn dashboard-v2-action ${
              danger
                ? 'dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)]'
                : 'dashboard-v2-action-primary'
            }`}
            onClick={() => onChoose(true)}
            disabled={isPending}
          >
            С уведомлением
          </button>
        </div>
      </div>
    </div>
  );
}
