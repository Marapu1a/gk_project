import { toast } from 'sonner';

type CandidateInfoCardProps = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  groupName: string;
};

function splitFullName(fullName: string | null) {
  const value = fullName?.trim();
  if (!value) return { firstLine: '—', secondLine: '' };

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstLine: value, secondLine: '' };

  return {
    firstLine: parts[0],
    secondLine: parts.slice(1).join(' '),
  };
}

export function CandidateInfoCard({
  fullName,
  email,
  avatarUrl,
  groupName,
}: CandidateInfoCardProps) {
  const name = splitFullName(fullName);
  const avatarSrc = avatarUrl || '/dashboard-v2/ava_mini.svg';

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email скопирован');
    } catch {
      toast.error('Не удалось скопировать email');
    }
  };

  return (
    <section className="flex min-h-[230px] flex-col items-center rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <h2 className="dashboard-v2-title mb-4">
        Информация
      </h2>

      <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full">
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="dashboard-v2-label mb-5 min-h-[44px] text-[#1F305E]">
        <div className="font-extrabold">{name.firstLine}</div>
        {name.secondLine ? <div className="font-medium">{name.secondLine}</div> : null}
      </div>

      <div className="dashboard-v2-title mb-6 w-full rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-2 text-[#1F305E]">
        {groupName || '—'}
      </div>

      <div className="mt-auto flex max-w-full items-center justify-center gap-2">
        <span className="dashboard-v2-label truncate font-medium text-[#1F305E]" title={email}>
          {email}
        </span>
        <button
          type="button"
          onClick={copyEmail}
          className="inline-flex h-[20px] w-[20px] shrink-0 cursor-pointer items-center justify-center"
          title="Скопировать email"
          aria-label="Скопировать email"
        >
          <img src="/dashboard-v2/icon_copy.svg" alt="" className="h-[16px] w-[16px]" />
        </button>
      </div>
    </section>
  );
}
