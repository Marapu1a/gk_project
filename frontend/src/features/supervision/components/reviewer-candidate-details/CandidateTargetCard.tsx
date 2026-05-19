import { CheckCircle, XCircle } from 'lucide-react';

type CandidateTargetCardProps = {
  targetLabel: string;
  ceuCurrent: number;
  ceuRequired: number;
  supervisionCurrent: number;
  supervisionRequired: number;
  supervisionLabel?: string;
  documentsReady?: boolean;
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isReady(current: number, required: number) {
  return required > 0 && current >= required;
}

export function CandidateTargetCard({
  targetLabel,
  ceuCurrent,
  ceuRequired,
  supervisionCurrent,
  supervisionRequired,
  supervisionLabel = 'Часы супервизии',
  documentsReady = false,
}: CandidateTargetCardProps) {
  return (
    <section className="flex min-h-[230px] flex-col rounded-[22px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <h2 className="dashboard-v2-title mb-7 text-center">
        Целевой уровень сертификации
      </h2>

      <div className="dashboard-v2-title mb-8 flex min-h-[42px] items-center justify-center rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-2 text-center">
        {targetLabel}
      </div>

      <ul className="mx-auto w-fit space-y-4">
        <StatusRow
          ok={isReady(ceuCurrent, ceuRequired)}
          label="CEU-Баллы"
          value={`${formatNumber(ceuCurrent)} / ${formatNumber(ceuRequired)}`}
        />
        <StatusRow
          ok={isReady(supervisionCurrent, supervisionRequired)}
          label={supervisionLabel}
          value={`${formatNumber(supervisionCurrent)} / ${formatNumber(supervisionRequired)}`}
        />
        <StatusRow
          ok={documentsReady}
          label="Документы"
          value={documentsReady ? 'подтверждено' : 'не подтверждено'}
        />
      </ul>
    </section>
  );
}

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="dashboard-v2-label flex items-center gap-2">
      {ok ? (
        <CheckCircle
          size={22}
          strokeWidth={2.4}
          className="shrink-0 text-[var(--color-green-brand)]"
        />
      ) : (
        <XCircle
          size={22}
          strokeWidth={2.4}
          className="shrink-0 text-[var(--color-danger)]"
        />
      )}

      <span className="font-extrabold text-[#1F305E]">{label}:</span>
      <span className="text-[#7F8AA3]">{value}</span>
    </li>
  );
}
