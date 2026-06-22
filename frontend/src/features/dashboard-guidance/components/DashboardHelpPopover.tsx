import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

type Position = { top: number; left: number };

export function DashboardHelpPopover({
  title,
  children,
  className,
  align = 'center',
}: Props) {
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const edge = 12;
      let left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
      if (align === 'left') left = triggerRect.left;
      if (align === 'right') left = triggerRect.right - panelRect.width;
      left = Math.min(Math.max(edge, left), window.innerWidth - panelRect.width - edge);

      const below = triggerRect.bottom + 12;
      const above = triggerRect.top - panelRect.height - 12;
      const top = below + panelRect.height <= window.innerHeight - edge || above < edge ? below : above;
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [align, open]);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span className={cn('dashboard-v2-help-wrap', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="dashboard-v2-help"
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      />

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              className="fixed z-[10000] w-[min(420px,calc(100vw-24px))] rounded-[12px] bg-white p-5 text-[#1F305E] shadow-[0_8px_30px_rgba(31,48,94,0.24)]"
              style={{ top: position?.top ?? -1000, left: position?.left ?? -1000 }}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <h3 id={titleId} className="dashboard-v2-title">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#7F8AA3] transition hover:bg-[var(--color-blue-soft)] hover:text-[var(--color-blue-dark)]"
                  aria-label="Закрыть подсказку"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="dashboard-v2-text whitespace-pre-line text-[#52617C]">{children}</div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
