import type { ButtonHTMLAttributes } from 'react';

const ARROW_ICON = '/dashboard-v2/button_arrow_mini.svg';

type ActionArrowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  size?: number;
};

export function ActionArrowButton({
  size = 34,
  className = '',
  style,
  disabled,
  ...props
}: ActionArrowButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:scale-105 disabled:cursor-default disabled:opacity-45',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <img src={ARROW_ICON} alt="" style={{ width: size, height: size }} />
    </button>
  );
}
