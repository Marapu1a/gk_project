import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const REASON_MARKER = 'Причина:';

type Props = {
  message: string;
  className?: string;
};

export function NotificationMessage({ message, className = '' }: Props) {
  const markerIndex = message.indexOf(REASON_MARKER);
  const textLayoutClassName = 'whitespace-pre-line [overflow-wrap:anywhere]';

  if (markerIndex === -1) {
    return (
      <p className={`${className} ${textLayoutClassName}`}>
        {message}
      </p>
    );
  }

  const intro = message.slice(0, markerIndex).trim();
  const reason = message.slice(markerIndex + REASON_MARKER.length).trim();

  if (!reason) {
    return (
      <p className={`${className} ${textLayoutClassName}`}>
        {message}
      </p>
    );
  }

  return (
    <p className={`${className} whitespace-pre-line [overflow-wrap:anywhere]`}>
      {intro}
      {intro ? ' ' : null}
      <span>{REASON_MARKER} </span>
      <TextTooltip content={reason}>наведите/кликните, чтобы прочесть</TextTooltip>
    </p>
  );
}

function TextTooltip({ content, children }: { content: string; children: string }) {
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
      className="dashboard-v2-help-wrap align-baseline"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={closeTooltip}
    >
      <button
        ref={buttonRef}
        type="button"
        className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[var(--color-blue-dark)] underline decoration-[var(--color-blue-dark)] decoration-1 underline-offset-4 transition hover:text-[var(--color-danger)] hover:decoration-[var(--color-danger)]"
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
      >
        {children}
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'dashboard-v2-tooltip dashboard-v2-tooltip-left',
          isOpen && 'dashboard-v2-tooltip-visible',
        )}
      >
        {content}
      </span>
    </span>
  );
}
