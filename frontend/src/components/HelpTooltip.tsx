import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type HelpTooltipProps = {
  content: ReactNode;
  title?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

type TooltipPosition = {
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
};

const HELP_TOOLTIP_OPEN_EVENT = 'app-help-tooltip-open';

export function HelpTooltip({ content, title, className, align = 'center' }: HelpTooltipProps) {
  const reactId = useId();
  const tooltipId = `help-tooltip-${reactId.replace(/:/g, '')}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const isOpen = isHovered || isFocused || isClicked;

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const button = buttonRef.current;
      const tooltip = tooltipRef.current;
      if (!button || !tooltip) return;

      const buttonRect = button.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const edge = 12;
      let left = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;

      if (align === 'left') left = buttonRect.left;
      if (align === 'right') left = buttonRect.right - tooltipRect.width;
      left = Math.min(Math.max(edge, left), window.innerWidth - tooltipRect.width - edge);

      const below = buttonRect.bottom + 12;
      const above = buttonRect.top - tooltipRect.height - 12;
      const placement = below + tooltipRect.height <= window.innerHeight - edge || above < edge ? 'bottom' : 'top';
      const top = placement === 'bottom' ? below : Math.max(edge, above);
      const arrowLeft = Math.min(
        Math.max(18, buttonRect.left + buttonRect.width / 2 - left),
        tooltipRect.width - 18,
      );

      setPosition({ top, left, arrowLeft, placement });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [align, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HELP_TOOLTIP_OPEN_EVENT, { detail: tooltipId }));
  }, [isOpen, tooltipId]);

  useEffect(() => {
    const close = () => {
      setIsHovered(false);
      setIsFocused(false);
      setIsClicked(false);
    };

    const closeOnOtherTooltip = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tooltipId) close();
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      close();
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener(HELP_TOOLTIP_OPEN_EVENT, closeOnOtherTooltip);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener(HELP_TOOLTIP_OPEN_EVENT, closeOnOtherTooltip);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [tooltipId]);

  const label = typeof content === 'string' ? content : title || 'Показать подсказку';

  return (
    <span
      className={cn('dashboard-v2-help-wrap', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className="dashboard-v2-help"
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsClicked((value) => !value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className={cn(
                'dashboard-v2-tooltip dashboard-v2-tooltip-portal dashboard-v2-tooltip-visible',
                position?.placement === 'top' && 'dashboard-v2-tooltip-above',
              )}
              style={{
                top: position?.top ?? -1000,
                left: position?.left ?? -1000,
                '--tooltip-arrow-left': `${position?.arrowLeft ?? 24}px`,
              } as CSSProperties}
            >
              {title ? <div className="dashboard-v2-tooltip-title">{title}</div> : null}
              <div className="whitespace-pre-line">{content}</div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

export const DashboardHelpTooltip = HelpTooltip;
export type { HelpTooltipProps };
