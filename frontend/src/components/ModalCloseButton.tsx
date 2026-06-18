const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'light';
  placement?: 'absolute' | 'inline';
  positionClassName?: string;
  label?: string;
};

export function ModalCloseButton({
  onClick,
  disabled,
  className = '',
  iconClassName,
  variant = 'default',
  placement = 'absolute',
  positionClassName,
  label = 'Закрыть',
}: Props) {
  const resolvedIconClassName =
    iconClassName ?? `h-5 w-5 ${variant === 'light' ? 'brightness-0 invert' : ''}`;
  const placementClassName =
    positionClassName ??
    (placement === 'inline'
      ? 'flex h-11 w-11'
      : 'absolute right-4 top-3 flex h-11 w-11');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${placementClassName} cursor-pointer items-center justify-center opacity-55 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
      aria-label={label}
      title={label}
    >
      <img src={EXIT_ICON} alt="" className={resolvedIconClassName} />
    </button>
  );
}
