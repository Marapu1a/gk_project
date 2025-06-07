import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSupervisionSummary } from '@/hooks/useSupervisionSummary';

export default function DashboardHome() {
  const { data: user } = useCurrentUser();
  const { data: summary } = useSupervisionSummary();

  if (!user || !summary) return <p>Загрузка...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>

      <section className="space-y-2">
        <p>
          <strong>Имя:</strong> {user.fullName}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Роль:</strong> {user.role}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Подтверждённые часы</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Инструкторская практика: {summary.hoursInstructor} ч.</li>
          <li>Кураторская практика: {summary.hoursCurator} ч.</li>
          <li>Супервизорская практика: {summary.hoursSupervisor} ч.</li>
        </ul>
      </section>
    </div>
  );
}
