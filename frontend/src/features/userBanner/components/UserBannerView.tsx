import { AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import type { UserBanner, UserBannerTone } from '../api/userBanner';

type UserBannerViewProps = {
  banner: Pick<UserBanner, 'tone' | 'message' | 'ctaLabel' | 'ctaUrl' | 'dismissible'>;
  onDismiss?: () => void;
  preview?: boolean;
};

const toneClass: Record<UserBannerTone, string> = {
  DANGER: 'bg-[var(--color-danger)] text-white',
  DARK: 'bg-[var(--color-blue-dark)] text-white',
  SOFT: 'bg-[#E5EFF1] text-[var(--color-blue-dark)]',
};

const buttonClass: Record<UserBannerTone, string> = {
  DANGER: 'border-white text-white hover:bg-white/15',
  DARK: 'border-white text-white hover:bg-white/10',
  SOFT: 'border-[var(--color-blue-dark)] text-[var(--color-blue-dark)] hover:bg-white/60',
};

const closeClass: Record<UserBannerTone, string> = {
  DANGER: 'text-white/75 hover:text-white',
  DARK: 'text-white/65 hover:text-white',
  SOFT: 'text-[var(--color-blue-dark)]/45 hover:text-[var(--color-blue-dark)]',
};

function isInternalUrl(value: string) {
  return value.startsWith('/');
}

function isAllowedUrl(value: string) {
  return isInternalUrl(value) || value.startsWith('https://') || value.startsWith('http://');
}

function renderMessage(message: string) {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(message))) {
    const [raw, label, url] = match;
    if (match.index > lastIndex) {
      nodes.push(message.slice(lastIndex, match.index));
    }

    const normalizedUrl = url.trim();
    if (isAllowedUrl(normalizedUrl)) {
      nodes.push(
        isInternalUrl(normalizedUrl) ? (
          <Link key={`${match.index}-${raw}`} to={normalizedUrl} className="font-extrabold underline">
            {label}
          </Link>
        ) : (
          <a
            key={`${match.index}-${raw}`}
            href={normalizedUrl}
            target="_blank"
            rel="noreferrer"
            className="font-extrabold underline"
          >
            {label}
          </a>
        ),
      );
    } else {
      nodes.push(label);
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < message.length) {
    nodes.push(message.slice(lastIndex));
  }

  return nodes.map((node, index) => {
    if (typeof node !== 'string') return node;
    return node.split('\n').map((part, partIndex, array) => (
      <span key={`${index}-${partIndex}`}>
        {part}
        {partIndex < array.length - 1 ? <br /> : null}
      </span>
    ));
  });
}

function ActionLink({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className: string;
}) {
  if (isInternalUrl(url)) {
    return (
      <Link to={url} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

export function UserBannerView({ banner, onDismiss, preview = false }: UserBannerViewProps) {
  const tone = banner.tone ?? 'DARK';
  const hasCta = Boolean(banner.ctaLabel && banner.ctaUrl && isAllowedUrl(banner.ctaUrl));

  return (
    <section
      className={`relative flex min-h-[74px] items-center gap-5 rounded-[16px] px-5 py-4 shadow-soft ${toneClass[tone]} ${
        preview ? 'min-h-[68px]' : ''
      }`}
    >
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[4px] border-current">
        <AlertCircle size={28} strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1 text-[15px] font-medium leading-[1.35]">
        {renderMessage(banner.message || 'Текст баннера')}
      </div>

      {hasCta ? (
        <ActionLink
          url={banner.ctaUrl!}
          className={`btn h-[42px] shrink-0 rounded-[8px] border px-8 text-[14px] font-extrabold ${buttonClass[tone]}`}
        >
          {banner.ctaLabel}
        </ActionLink>
      ) : null}

      {banner.dismissible && onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${closeClass[tone]}`}
          aria-label="Закрыть баннер"
        >
          <X size={28} strokeWidth={1.5} />
        </button>
      ) : null}
    </section>
  );
}
