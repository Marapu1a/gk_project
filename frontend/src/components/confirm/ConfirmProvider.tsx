import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

type ConfirmVariant = 'primary' | 'danger';

export type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = Required<Pick<ConfirmOptions, 'title' | 'confirmLabel' | 'cancelLabel' | 'variant'>> &
  Pick<ConfirmOptions, 'message' | 'description'> & {
    resolve: (value: boolean) => void;
  };

const DEFAULTS = {
  title: 'Подтвердите действие',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Назад',
  variant: 'primary' as ConfirmVariant,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    const options: ConfirmOptions = typeof input === 'string' ? { message: input } : input;

    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setPending({
        title: options.title ?? DEFAULTS.title,
        message: options.message,
        description: options.description,
        confirmLabel: options.confirmLabel ?? DEFAULTS.confirmLabel,
        cancelLabel: options.cancelLabel ?? DEFAULTS.cancelLabel,
        variant: options.variant ?? DEFAULTS.variant,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    if (!pending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, pending]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending ? <ConfirmDialog pending={pending} onClose={close} /> : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }

  return context;
}

function ConfirmDialog({
  pending,
  onClose,
}: {
  pending: PendingConfirm;
  onClose: (value: boolean) => void;
}) {
  const confirmClass =
    pending.variant === 'danger'
      ? 'confirm-action-danger'
      : 'confirm-action-primary';

  const dialog = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-[430px] rounded-[16px] bg-white px-5 pb-5 pt-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
      >
        <button
          type="button"
          onClick={() => onClose(false)}
          className="absolute right-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center opacity-65 transition hover:opacity-100"
          aria-label="Закрыть"
        >
          <img src={EXIT_ICON} alt="" className="h-6 w-6" />
        </button>

        <h2
          id="confirm-dialog-title"
          className="pr-8 text-center text-[24px] font-extrabold leading-tight text-[var(--color-blue-dark)]"
        >
          {pending.title}
        </h2>

        <div className="mx-auto mt-7 max-w-[320px] text-center text-[14px] leading-[1.45] text-[#222]">
          <div>{pending.message}</div>
          {pending.description ? (
            <div className="mt-1 text-[var(--color-blue-dark)]">{pending.description}</div>
          ) : null}
        </div>

        <div className="mt-9 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="btn h-[48px] rounded-[10px] border-2 border-[var(--color-blue-dark)] text-[15px] font-extrabold text-[var(--color-blue-dark)] hover:bg-[rgba(31,48,94,0.04)]"
          >
            {pending.cancelLabel}
          </button>

          <button
            type="button"
            onClick={() => onClose(true)}
            className={`btn h-[48px] rounded-[10px] text-[15px] font-extrabold ${confirmClass}`}
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
