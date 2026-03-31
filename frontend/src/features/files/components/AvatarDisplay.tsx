// src/features/files/components/AvatarDisplay.tsx
type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  w?: string;
  h?: string;
  onClick?: () => void;
  editable?: boolean;
};

export function AvatarDisplay({
  src,
  alt,
  className,
  w = 'w-28',
  h = 'h-28',
  onClick,
  editable = false,
}: Props) {
  const placeholder = '/dashboard-v2/info/icon_person.svg';
  const clickable = Boolean(onClick);

  return (
    <div
      className={`relative ${w} ${h} ${className ?? ''} ${clickable ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      aria-label={clickable ? (editable ? 'Изменить аватар' : 'Открыть') : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      title={editable ? 'Нажмите, чтобы изменить аватар' : undefined}
    >
      <img
        src={src || placeholder}
        alt={alt}
        loading="lazy"
        className="block w-full h-full object-contain select-none"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          if (el.src.endsWith('dashboard-v2/info/icon_person.svg')) return;
          el.src = placeholder;
        }}
      />

      {editable && (
        <div className="absolute right-0 bottom-0 pointer-events-none select-none transition duration-200 ease-out group-hover:scale-105 group-hover:-translate-y-px">
          <EditAvatarIcon />
        </div>
      )}
    </div>
  );
}

function EditAvatarIcon() {
  return (
    <svg
      width="41"
      height="41"
      viewBox="0 0 41 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      <g opacity="0.7" filter="url(#editAvatarShadow)">
        <rect
          x="6"
          y="4"
          width="28.7234"
          height="28.7234"
          rx="12"
          className="fill-white transition-colors duration-200 group-hover:fill-[#1F305E]"
        />
      </g>

      <path
        d="M26.2997 10.1701C26.6965 9.83 27.2881 9.85272 27.6576 10.2222L29.4687 12.0333C29.8382 12.4028 29.861 12.9945 29.5209 13.3912L21.4642 22.7907C21.0851 23.233 20.4097 23.2589 19.9978 22.847L16.8439 19.6931C16.432 19.2812 16.458 18.6059 16.9003 18.2268L26.2997 10.1701Z"
        className="fill-[#1F305E] transition-colors duration-200 group-hover:fill-white"
      />

      <path
        d="M14.157 20.7614C14.3136 19.9782 15.2799 19.6857 15.8447 20.2504L19.4436 23.8494C20.0084 24.4141 19.7158 25.3804 18.9326 25.5371L14.434 26.4368C13.7342 26.5767 13.1173 25.9598 13.2573 25.2601L14.157 20.7614Z"
        className="fill-[#1F305E] transition-colors duration-200 group-hover:fill-white"
      />

      <defs>
        <filter
          id="editAvatarShadow"
          x="0"
          y="0"
          width="40.7227"
          height="40.7234"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology radius="2" operator="dilate" in="SourceAlpha" result="effect1_dropShadow" />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}
