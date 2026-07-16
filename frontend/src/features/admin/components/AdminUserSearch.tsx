import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useUserTypeahead } from '@/features/groups/hooks/useUserTypeahead';
import { formatCertificationLevelName } from '@/utils/labels';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  size?: 'compact' | 'large';
  placeholder?: string;
};

function cleanPhone(value?: string | null) {
  return value?.trim() || '';
}

export function AdminUserSearch({
  value,
  onChange,
  autoFocus = false,
  className = '',
  size = 'compact',
  placeholder = 'Введите ФИО, email, телефон или рег. номер',
}: Props) {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalValue, setInternalValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = value ?? internalValue;
  const { data = [], isFetching } = useUserTypeahead(query, { limit: 8, minLength: 2, debounceMs: 180 });
  const normalizedQuery = query.trim();
  const showResults = isOpen && normalizedQuery.length >= 2;

  const inputClass =
    size === 'large'
      ? 'h-[46px] rounded-[14px] pl-5 pr-12 text-[16px]'
      : 'h-[36px] rounded-full pl-4 pr-10 text-[14px]';
  const maxWidth = size === 'large' ? 'max-w-[620px]' : 'max-w-[330px]';

  const suggestions = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (activeIndex > suggestions.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, suggestions.length]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((event.ctrlKey && event.key.toLowerCase() === 'k') || (!isEditable && event.key === '/')) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const setQuery = (nextValue: string) => {
    onChange?.(nextValue);
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    setActiveIndex(0);
    setIsOpen(true);
  };

  const openUser = (userId: string) => {
    setIsOpen(false);
    navigate(`/admin/users/${userId}`);
  };

  return (
    <div ref={rootRef} className={`relative w-full ${maxWidth} ${className}`}>
      <label className="sr-only" htmlFor={listId}>
        Поиск пользователя
      </label>
      <input
        ref={inputRef}
        id={listId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (!showResults) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && suggestions[activeIndex]) {
            event.preventDefault();
            openUser(suggestions[activeIndex].id);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete="off"
        className={`input-design input-design-trailing-icon w-full ${inputClass}`}
        role="combobox"
        aria-expanded={showResults}
        aria-controls={`${listId}-results`}
      />
      {!query ? (
        <Search
          size={size === 'large' ? 20 : 17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D96B5]"
        />
      ) : null}

      {showResults ? (
        <div
          id={`${listId}-results`}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[14px] border border-[#D7E2E7] bg-white shadow-soft"
          role="listbox"
        >
          {isFetching && !suggestions.length ? (
            <div className="dashboard-v2-text px-4 py-3 text-[#8D96B5]">Ищу пользователя...</div>
          ) : suggestions.length ? (
            suggestions.map((user, index) => {
              const group = user.groupName ? formatCertificationLevelName(user.groupName) : 'Без уровня';
              const phone = cleanPhone(user.phone);
              const reg = user.registrationNumber ? `N ${user.registrationNumber}` : '';
              const isActive = index === activeIndex;

              return (
                <button
                  key={user.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    openUser(user.id);
                  }}
                  className={`block w-full px-4 py-3 text-left transition ${
                    isActive ? 'bg-[var(--color-blue-soft)]' : 'bg-white hover:bg-[var(--color-blue-soft)]'
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="dashboard-v2-text truncate font-extrabold text-blue-dark">
                        {user.fullName || user.email}
                      </div>
                      <div className="dashboard-v2-caption truncate text-[#6B7894]">
                        {user.email}
                        {user.fullNameLatin ? ` · ${user.fullNameLatin}` : ''}
                      </div>
                      {phone || reg ? (
                        <div className="dashboard-v2-caption truncate text-[#8D96B5]">
                          {[phone, reg].filter(Boolean).join(' · ')}
                        </div>
                      ) : null}
                    </div>
                    <span className="dashboard-v2-small shrink-0 rounded-full bg-[var(--color-blue-soft)] px-3 py-1 text-blue-dark">
                      {group}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="dashboard-v2-text px-4 py-3 text-[#8D96B5]">Пользователь не найден</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
