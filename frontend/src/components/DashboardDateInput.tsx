type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function DashboardDateInput({
  value,
  onChange,
  className = '',
  ariaLabel,
}: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={`input-design ${className} ${value ? '' : 'text-[#8D96B5]'}`}
    />
  );
}
