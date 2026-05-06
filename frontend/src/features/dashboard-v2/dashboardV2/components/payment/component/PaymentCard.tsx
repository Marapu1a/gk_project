import { PaymentStatusIcon } from './PaymentStatusIcon';

type PaymentCardStatus = 'UNPAID' | 'PENDING' | 'PAID';

type PaymentCardProps = {
  title: string;
  status: PaymentCardStatus;
  isFullPackage?: boolean;
  onPay?: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function PaymentCard({
  title,
  status,
  isFullPackage = false,
  onPay,
  disabled = false,
  disabledReason,
}: PaymentCardProps) {
  const isPaid = status === 'PAID';
  const isPending = status === 'PENDING';
  const isUnpaid = status === 'UNPAID';

  const cardClassName = [
    'rounded-[14px] border px-4 py-3 transition',
    'border-[#B8C2D1] bg-white',
    isFullPackage && !isPaid ? 'payment-package-card' : '',
    isPaid ? 'opacity-70' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const titleClassName = [
    'text-[13px] font-extrabold leading-[1.15]',
    isPaid ? 'text-[#9FB3B8]' : 'text-[#1F305E]',
  ].join(' ');

  return (
    <div className={cardClassName}>
      <div className="grid min-h-[48px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <span className={`${titleClassName} line-clamp-3`}>{title}</span>

          {disabled && disabledReason ? (
            <span className="mt-1 block truncate text-[10px] leading-none text-[#8D96B5]">
              {disabledReason}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isFullPackage && !isPaid && (
            <span className="rounded-full bg-[#FF62B8] px-2.5 py-[5px] text-[10px] font-bold leading-none text-white">
              -35%
            </span>
          )}

          {isPaid ? (
            <PaymentStatusIcon className="h-[34px] w-[34px]" />
          ) : isPending ? (
            <button
              type="button"
              disabled
              className="h-[34px] min-w-[98px] cursor-not-allowed rounded-full bg-[#7583A3] px-3 text-[12px] font-semibold leading-none text-white"
            >
              На проверке
            </button>
          ) : isUnpaid ? (
            <button
              type="button"
              onClick={onPay}
              disabled={disabled}
              title={disabledReason}
              className="h-[34px] min-w-[98px] cursor-pointer rounded-full bg-[#1F305E] px-3 text-[13px] font-semibold leading-none text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#9AA4BD] disabled:opacity-100"
            >
              Оплатить
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
