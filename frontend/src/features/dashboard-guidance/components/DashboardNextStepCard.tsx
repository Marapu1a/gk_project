import { ArrowRight, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardGuidanceStep } from '../model/types';

type Props = {
  step: DashboardGuidanceStep;
};

const toneClass = {
  info: 'bg-[var(--color-blue-soft)]',
  attention: 'bg-[#FFF3C9]',
  success: 'bg-[#EEF6D7]',
} as const;

const toneIcon = {
  info: Clock3,
  attention: ListChecks,
  success: CheckCircle2,
} as const;

export function DashboardNextStepCard({ step }: Props) {
  const navigate = useNavigate();
  const Icon = toneIcon[step.tone];

  const handleAction = () => {
    if (!step.action) return;
    if (step.action.type === 'route') {
      navigate(step.action.target);
      return;
    }

    document.getElementById(step.action.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section
      className={`grid min-h-[92px] items-center gap-4 rounded-[16px] px-5 py-4 shadow-soft sm:grid-cols-[auto_minmax(0,1fr)_auto] ${toneClass[step.tone]}`}
      aria-labelledby="dashboard-next-step-title"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-white text-[var(--color-blue-dark)]">
        <Icon size={22} aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <div className="dashboard-v2-caption mb-1 text-[#7F8AA3]">Что делать сейчас</div>
        <h2 id="dashboard-next-step-title" className="dashboard-v2-title mb-1">
          {step.title}
        </h2>
        <p className="dashboard-v2-text text-[#52617C]">{step.description}</p>
      </div>

      {step.action ? (
        <button
          type="button"
          onClick={handleAction}
          className="btn btn-dark dashboard-v2-label flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-[8px] px-5"
        >
          {step.action.label}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
