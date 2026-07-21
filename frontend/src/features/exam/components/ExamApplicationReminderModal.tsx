import { CheckCircle2 } from 'lucide-react';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';

type Props = {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function ExamApplicationReminderModal({
  open,
  isPending,
  onClose,
  onSubmit,
}: Props) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      closeOnEscape={!isPending}
      ariaLabelledBy="exam-application-reminder-title"
      overlayClassName="z-[1050] bg-black/60 px-4 py-5"
      dialogClassName="relative w-full max-w-[540px] rounded-[22px] bg-white px-6 py-7 text-center text-[var(--color-blue-dark)] shadow-[0_18px_45px_rgba(0,0,0,0.24)]"
    >
      <ModalCloseButton onClick={onClose} disabled={isPending} />

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF6D7] text-[var(--color-green-brand)]">
        <CheckCircle2 size={30} aria-hidden="true" />
      </div>

      <h2 id="exam-application-reminder-title" className="dashboard-v2-page-title mt-4">
        Всё готово для экзамена
      </h2>
      <p className="dashboard-v2-text mx-auto mt-3 max-w-[420px] text-[#52617C]">
        Все условия сертификации выполнены. Осталось подать заявку на экзамен, чтобы
        администратор мог начать её обработку.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="btn dashboard-v2-label h-[46px] rounded-[10px] border-2 border-[var(--color-blue-dark)] text-[var(--color-blue-dark)] disabled:opacity-60"
        >
          Напомнить позже
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="btn btn-dark dashboard-v2-label h-[46px] rounded-[10px] disabled:bg-[#B7BFCE]"
        >
          {isPending ? 'Отправляем...' : 'Подать заявку на экзамен'}
        </button>
      </div>
    </ModalShell>
  );
}
