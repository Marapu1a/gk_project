import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type DashboardHelpTooltipProps = {
  content: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

export function DashboardHelpTooltip({
  content,
  className,
  align = 'center',
}: DashboardHelpTooltipProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const isOpen = isHovered || isFocused || isClicked;

  const closeTooltip = () => {
    setIsHovered(false);
    setIsClicked(false);
    if (isClicked) {
      buttonRef.current?.blur();
    }
  };

  return (
    <span
      className={cn('dashboard-v2-help-wrap', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={closeTooltip}
    >
      <button
        ref={buttonRef}
        type="button"
        className="dashboard-v2-help"
        aria-label={content}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsClicked((value) => !value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setIsClicked(false);
        }}
      />

      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'dashboard-v2-tooltip',
          `dashboard-v2-tooltip-${align}`,
          isOpen && 'dashboard-v2-tooltip-visible',
        )}
      >
        {content}
      </span>
    </span>
  );
}
