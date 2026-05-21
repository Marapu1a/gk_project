import type { ReactNode } from 'react';

type Props = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function AdminUserSection({ title, isOpen, onToggle, children }: Props) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-white shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="dashboard-v2-title">{title}</span>

        <span className="flex shrink-0 items-center gap-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-blue-soft)]"
            title="Редактировать блок"
            aria-hidden="true"
          >
            <img src="/dashboard-v2/info/Button_edit.svg" alt="" className="h-5 w-5" />
          </span>
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
              isOpen ? '' : 'rotate-180'
            }`}
            title={isOpen ? 'Свернуть' : 'Развернуть'}
            aria-hidden="true"
          >
            <img src="/dashboard-v2/btn_hide.svg" alt="" className="h-5 w-5" />
          </span>
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-[var(--color-blue-soft)] px-6 py-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
