import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type DashboardHelpTooltipProps = {
  content: ReactNode;
  title?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

type TooltipPosition = { top: number; left: number };

export function DashboardHelpTooltip({
  content,
  title,
  className,
  align = 'center',
}: DashboardHelpTooltipProps) {
  const tooltipId = useId();
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
      const top = below + tooltipRect.height <= window.innerHeight - edge || above < edge ? below : above;
      setPosition({ top, left });
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
    if (!isClicked) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) setIsClicked(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isClicked]);

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
              className="dashboard-v2-tooltip dashboard-v2-tooltip-portal dashboard-v2-tooltip-visible"
              style={{
                top: position?.top ?? -1000,
                left: position?.left ?? -1000,
              }}
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
