type Props = {
  summary: {
    hoursInstructor: number;
    hoursCurator: number;
    hoursSupervisor: number;
  };
};

export function SupervisionSummary({ summary }: Props) {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Подтверждённые часы</h2>
      <ul className="list-disc ml-5 space-y-1">
        <li>Инструкторская практика: {summary.hoursInstructor} ч.</li>
        <li>Кураторская практика: {summary.hoursCurator} ч.</li>
        <li>Супервизорская практика: {summary.hoursSupervisor} ч.</li>
      </ul>
    </section>
  );
}
