type PaymentStatusIconProps = {
  className?: string;
};

export function PaymentStatusIcon({ className = '' }: PaymentStatusIconProps) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#C7D3E3] ${className}`}
      aria-label="Оплачено"
      title="Оплачено"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 12.5L10 16.5L18 8.5"
          stroke="#9FB3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
