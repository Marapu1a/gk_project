import { Search, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
};

export function AdminIdentityFilterInput({
  value,
  onChange,
  placeholder = 'Введите ФИО, email, телефон или рег. номер',
  className = '',
  inputClassName = '',
  ariaLabel = 'Поиск пользователя',
}: Props) {
  const hasValue = value.trim().length > 0;

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`input-design input-design-trailing-icon w-full ${inputClassName}`}
        autoComplete="off"
        aria-label={ariaLabel}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="btn absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8D96B5] transition hover:bg-[var(--color-blue-soft)] hover:text-[var(--color-blue-dark)]"
          aria-label="Очистить поиск"
        >
          <X size={16} />
        </button>
      ) : (
        <Search
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D96B5]"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
