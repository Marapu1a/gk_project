import { ChevronRight } from 'lucide-react';

type Props = {
  label: string;
  badge?: number;
  onClick: () => void;
};

export function DashboardNavRow({ label, badge, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-section dashboard-v2-text flex w-full items-center justify-between px-5 py-4 text-left font-extrabold text-blue-dark shadow-soft"
    >
      <span className="flex items-center gap-2">
        {label}
        {badge ? (
          <span className="badge badge-danger inline-flex min-w-[22px] items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>

      <ChevronRight size={18} className="shrink-0 text-[#97A0BD]" />
    </button>
  );
}
