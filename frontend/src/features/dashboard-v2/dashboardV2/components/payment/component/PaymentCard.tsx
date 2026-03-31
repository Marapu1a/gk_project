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
    'rounded-[18px] border px-5 py-4 transition',
    'border-[#B8C2D1] bg-white',
    isFullPackage && !isPaid ? 'payment-package-card' : '',
    isPaid ? 'opacity-70' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const titleClassName = [
    'text-[15px] font-semibold leading-[1.15]',
    isPaid ? 'text-[#9FB3B8]' : 'text-[#1F305E]',
  ].join(' ');

  return (
    <div className={cardClassName}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <span className={titleClassName}>{title}</span>

          {isFullPackage && !isPaid && (
            <span className="shrink-0 rounded-full bg-[#FF62B8] px-3 py-[6px] text-[11px] font-bold leading-none text-white">
              -35%
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isPaid ? (
            <PaymentStatusIcon />
          ) : isPending ? (
            <button
              type="button"
              disabled
              className="min-w-[132px] cursor-not-allowed rounded-full bg-[#7583A3] px-4 py-[10px] text-[14px] font-semibold leading-none text-white"
            >
              На проверке
            </button>
          ) : isUnpaid ? (
            <>
              <button
                type="button"
                onClick={onPay}
                disabled={disabled}
                title={disabledReason}
                className="min-w-[132px] rounded-full bg-[#1F305E] px-4 py-[10px] text-[14px] font-semibold leading-none text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#9AA4BD] disabled:opacity-100"
              >
                Оплатить
              </button>

              {disabled && disabledReason ? (
                <span className="max-w-[150px] text-right text-[10px] leading-[1.2] text-[#8D96B5]">
                  {disabledReason}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
