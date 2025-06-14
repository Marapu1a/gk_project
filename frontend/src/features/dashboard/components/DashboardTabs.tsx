import { Link } from 'react-router-dom';

// src/features/dashboard/components/DashboardTabs.tsx
export function DashboardTabs() {
  return (
    <div className="border p-4 rounded shadow-sm">
      <h2 className="text-xl font-semibold mb-2 text-blue-dark">Навигация</h2>
      <ul className="flex flex-wrap gap-4">
        <li>
          <Link to={'/ceu/create'} className="btn btn-brand">
            Добавить CEU-баллы
          </Link>
        </li>
        <li>
          <Link to={'/supervision/create'} className="btn btn-brand">
            Добавить часы супервизии
          </Link>
        </li>
        <li>
          <button className="btn btn-brand">Мои заявки</button>
        </li>
        <li>
          <button className="btn btn-brand">История</button>
        </li>
      </ul>
    </div>
  );
}
