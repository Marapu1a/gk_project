export type NameSortDirection = 'asc' | 'desc' | null;

export function nextNameSortDirection(current: NameSortDirection): NameSortDirection {
  if (current === null) return 'asc';
  if (current === 'asc') return 'desc';
  return null;
}

export function sortByFullName<T>(
  rows: T[],
  getName: (row: T) => string | null | undefined,
  direction: NameSortDirection,
) {
  if (!direction) return rows;

  const collator = new Intl.Collator('ru', { sensitivity: 'base' });
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const result = collator.compare(getName(a.row) || '', getName(b.row) || '');
      return result === 0 ? a.index - b.index : direction === 'asc' ? result : -result;
    })
    .map(({ row }) => row);
}

export function NameSortButton({
  direction,
  onClick,
  label = 'ФИО',
  className = '',
}: {
  direction: NameSortDirection;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  const next = nextNameSortDirection(direction);
  const title =
    next === 'asc'
      ? 'Сортировать по фамилии: от А до Я'
      : next === 'desc'
        ? 'Сортировать по фамилии: от Я до А'
        : 'Отключить сортировку по фамилии';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 font-medium ${className}`}
      title={title}
      aria-label={title}
    >
      {label}
      {direction === 'asc' ? <span aria-hidden="true">↑</span> : null}
      {direction === 'desc' ? <span aria-hidden="true">↓</span> : null}
    </button>
  );
}
