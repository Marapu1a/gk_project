type CandidateCeuCardProps = {
  summary: {
    required: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
    } | null;
    usable: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
    };
  };
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function capToRequired(value: number, required: number) {
  if (required <= 0) return Math.max(0, value);
  return Math.min(Math.max(0, value), required);
}

export function CandidateCeuCard({ summary }: CandidateCeuCardProps) {
  const rows = [
    ['Этика', summary.usable.ethics, summary.required?.ethics ?? 0],
    ['Культурное разнообразие', summary.usable.cultDiver, summary.required?.cultDiver ?? 0],
    ['Супервизия', summary.usable.supervision, summary.required?.supervision ?? 0],
    ['Общие баллы', summary.usable.general, summary.required?.general ?? 0],
  ] as const;

  return (
    <section className="flex min-h-[230px] flex-col rounded-[22px] bg-white px-6 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <h2 className="dashboard-v2-title mb-6 text-center">
        CEU-Баллы
      </h2>

      <div className="space-y-0 text-[#1F305E]">
        {rows.map(([label, value, required]) => {
          const displayValue = capToRequired(value, required);
          const isEmpty = displayValue <= 0 && required <= 0;

          return (
            <div
              key={label}
              className="flex min-h-[42px] items-center justify-between border-b border-[#DCE8EC] py-2 last:border-b-0"
            >
              <span className="dashboard-v2-label font-medium">{label}</span>
              <span
                className={`dashboard-v2-metric-value-lg ${
                  isEmpty ? 'text-[#A7B1C7]' : 'text-[#1F305E]'
                }`}
              >
                {formatNumber(displayValue)}
                <span className="dashboard-v2-label ml-1 text-[#7F8AA3]">
                  /{formatNumber(required)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
