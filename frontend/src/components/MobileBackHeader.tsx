import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  onBack: () => void;
};

export function MobileBackHeader({ title, onBack }: Props) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад"
        className="icon-button icon-button-primary h-9 w-9 shrink-0 rounded-full border border-[var(--color-border-soft)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <h1 className="dashboard-v2-title">{title}</h1>
    </div>
  );
}
