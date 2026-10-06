type Props = {
  warnings: string[];
  reason: string;
  onReasonChange: (value: string) => void;
};

export function CertificateWarningsPanel({ warnings, reason, onReasonChange }: Props) {
  return (
    <div role="alert" className="mt-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">Проверьте данные по PDF перед сохранением:</p>
      <ul className="mt-1 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      <label className="mt-3 block font-medium" htmlFor="certificate-warning-reason">Причина подтверждения</label>
      <input
        id="certificate-warning-reason"
        className="mt-1 w-full rounded border border-amber-400 bg-white px-2 py-1"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="Например: сверено с загруженным PDF"
        maxLength={500}
      />
      <p className="mt-1">После проверки нажмите «Сохранить» ещё раз.</p>
    </div>
  );
}
