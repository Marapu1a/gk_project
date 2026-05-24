import { ArrowLeft, ArrowRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [20, 50, 100, 250, 500] as const;

function pageNumbers(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 1, total - 2));
  const end = Math.min(total, start + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function DashboardPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-3 pt-1">
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={currentPage <= 1}
        className="dashboard-v2-caption cursor-pointer text-[#8D96B5] disabled:cursor-default disabled:opacity-35"
      >
        Начало
      </button>

      <PaginationArrow
        direction="prev"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      />

      {pageNumbers(currentPage, totalPages).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          className={`btn flex h-[30px] min-w-[30px] items-center justify-center rounded-full px-2 text-[13px] ${
            pageNumber === currentPage
              ? 'border border-[var(--color-blue-dark)] bg-white text-[var(--color-blue-dark)]'
              : 'bg-[#DDE2EB] text-[#8D96B5]'
          }`}
        >
          {pageNumber}
        </button>
      ))}

      <PaginationArrow
        direction="next"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      />

      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage >= totalPages}
        className="dashboard-v2-caption cursor-pointer text-[#8D96B5] disabled:cursor-default disabled:opacity-35"
      >
        Конец
      </button>
    </nav>
  );
}

function PaginationArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn flex h-[34px] w-[42px] items-center justify-center rounded-full bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-blue-darker)] disabled:cursor-not-allowed disabled:bg-[#DDE2EB] disabled:text-white"
      aria-label={direction === 'prev' ? 'Предыдущая страница' : 'Следующая страница'}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

export function PageSizeSelect({
  value,
  onChange,
  className = '',
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <label className={`dashboard-v2-caption flex items-center gap-2 text-[#6B7894] ${className}`}>
      Строк:
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="input-design h-[34px] w-[78px] rounded-full py-0"
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
