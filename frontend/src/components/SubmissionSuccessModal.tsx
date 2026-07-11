import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { ModalCloseButton } from './ModalCloseButton';

type SubmissionSuccessModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export function SubmissionSuccessModal({
  open,
  title,
  description,
  onClose,
}: SubmissionSuccessModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-success-title"
        className="relative w-full max-w-[460px] rounded-[16px] bg-white px-6 py-7 text-center text-[#1F305E] shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
      >
        <ModalCloseButton onClick={onClose} iconClassName="h-6 w-6" />

        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#A5CB37] bg-[rgba(165,203,55,0.12)] text-[#75AD14]">
          <Check size={30} strokeWidth={3} aria-hidden="true" />
        </span>

        <h2 id="submission-success-title" className="mt-4 text-[21px] font-extrabold leading-tight">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-[350px] text-[15px] leading-[1.45] text-[#6B7894]">
          {description}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-dark mt-6 h-[44px] w-full rounded-[10px] text-[15px] font-extrabold"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body,
  );
}
