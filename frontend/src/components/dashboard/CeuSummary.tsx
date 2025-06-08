type Props = {
  ceuSummary: {
    required: {
      ethics: number;
      cultDiver: number;
      general: number;
    } | null;
    percent: {
      ethics: number;
      cultDiver: number;
      general: number;
    } | null;
    usable: {
      ethics: number;
      cultDiver: number;
      general: number;
    };
  };
};

export function CeuSummary({ ceuSummary }: Props) {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-2">CEU-баллы</h2>

      {ceuSummary.required ? (
        <ul className="list-disc ml-5 space-y-1">
          <li>
            Этика: {ceuSummary.percent?.ethics}% ({ceuSummary.usable.ethics}/
            {ceuSummary.required.ethics})
          </li>
          <li>
            Культура: {ceuSummary.percent?.cultDiver}% ({ceuSummary.usable.cultDiver}/
            {ceuSummary.required.cultDiver})
          </li>
          <li>
            Общее: {ceuSummary.percent?.general}% ({ceuSummary.usable.general}/
            {ceuSummary.required.general})
          </li>
        </ul>
      ) : (
        <p>Для вашей группы нет CEU-требований.</p>
      )}
    </section>
  );
}
