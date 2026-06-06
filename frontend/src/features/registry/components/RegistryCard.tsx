import { Mail } from 'lucide-react';
import { ActionArrowButton } from '@/components/ActionArrowButton';

type Props = {
  id: string;
  fullName: string;
  fullNameLatin?: string | null;
  country?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  groupName?: string | null;
  variant?: 'specialist' | 'applicant';
  onOpenProfile?: (userId: string) => void;
};

export function RegistryCard({
  id,
  fullName,
  country,
  city,
  avatarUrl,
  groupName,
  variant = 'specialist',
  onOpenProfile,
}: Props) {
  const location = [country, city].filter(Boolean).join(', ');
  const placeholder = '/avatar_placeholder.svg';
  const clickable = Boolean(onOpenProfile);
  const isApplicant = variant === 'applicant';

  return (
    <article
      className={[
        'group grid h-[142px] grid-cols-[104px_minmax(0,1fr)_30px] items-center gap-4 rounded-[16px] bg-white px-4 py-3 shadow-soft transition',
        clickable ? 'cursor-pointer hover:bg-[var(--color-blue-soft)] hover:shadow-md' : '',
      ].join(' ')}
      onClick={() => onOpenProfile?.(id)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenProfile?.(id);
        }
      }}
    >
      <div className="flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-[8px] border border-[#B8C1D6] bg-[#E7EAF0]">
        <img
          src={avatarUrl || placeholder}
          alt={fullName}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src.endsWith('avatar_placeholder.svg')) return;
            el.src = placeholder;
          }}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-col self-stretch py-1">
        <h3 className="line-clamp-2 min-h-[38px] text-[17px] font-extrabold leading-[1.1] text-[#222]">
          {fullName}
        </h3>
        <p className="mt-2 truncate text-[14px] font-semibold text-[#8D96B5]">{location || '—'}</p>
        {!isApplicant && groupName && (
          <span className="mt-3 inline-flex min-h-[28px] w-fit max-w-full items-center rounded-full bg-[var(--color-blue-soft)] px-3 text-[13px] font-extrabold leading-[1.1] text-[var(--color-blue-dark)]">
            <span className="truncate">{groupName}</span>
          </span>
        )}
      </div>

      <div className="flex h-full items-end pb-3">
        {isApplicant ? (
          <ActionArrowButton
            size={30}
            aria-label="Открыть профиль"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile?.(id);
            }}
          />
        ) : (
          <button
            type="button"
            className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[6px] bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-green-brand)] hover:text-[var(--color-blue-dark)]"
            aria-label="Написать пользователю"
            onMouseEnter={(e) => {
              e.currentTarget.closest('article')?.classList.add('registry-card-mail-hover');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.closest('article')?.classList.remove('registry-card-mail-hover');
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={20} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </article>
  );
}
