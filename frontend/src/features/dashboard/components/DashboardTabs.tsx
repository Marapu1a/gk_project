import { Link } from 'react-router-dom';
import { BookOpenCheck, Timer, Clock, ListChecks, FileSearch, Users } from 'lucide-react';

type DashboardTabsProps = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
    groups: { id: string; name: string }[];
  };
};

export function DashboardTabs({ user }: DashboardTabsProps) {
  const isSupervisor = user.groups.some((g) => g.name === 'Супервизор');
  const isExperiencedSupervisor = user.groups.some((g) => g.name === 'Опытный Супервизор');

  return (
    <div className="bg-blue-soft border border-blue-dark/20 p-6 rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-blue-dark">Навигация</h2>

      {/* Верхний фиксированный ряд */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <li>
          <Link to="/ceu/create" className="btn btn-brand w-full">
            <div className="flex items-center justify-center gap-2">
              <BookOpenCheck size={18} />
              <span>Добавить CEU-баллы</span>
            </div>
          </Link>
        </li>
        <li>
          <Link to="/supervision/create" className="btn btn-brand w-full">
            <div className="flex items-center justify-center gap-2">
              <Timer size={18} />
              <span>
                {isSupervisor || isExperiencedSupervisor
                  ? 'Добавить часы менторства'
                  : 'Добавить часы супервизии'}
              </span>
            </div>
          </Link>
        </li>
        <li>
          <Link to="/history" className="btn btn-brand w-full">
            <div className="flex items-center justify-center gap-2">
              <Clock size={18} />
              <span>История</span>
            </div>
          </Link>
        </li>
      </ul>

      {/* Нижний гибкий ряд */}
      {(user.role === 'REVIEWER' || user.role === 'ADMIN') && (
        <ul className="flex flex-wrap justify-between gap-3">
          <li>
            <Link to="/review/ceu" className="btn btn-accent w-full">
              <div className="flex items-center justify-center gap-2">
                <FileSearch size={18} />
                <span>Проверка CEU</span>
              </div>
            </Link>
          </li>

          <li>
            <Link to="/review/supervision" className="btn btn-accent w-full">
              <div className="flex items-center justify-center gap-2">
                <ListChecks size={18} />
                <span>Проверка супервизии</span>
              </div>
            </Link>
          </li>

          {isExperiencedSupervisor && (
            <li>
              <Link to="/review/mentorship" className="btn btn-accent w-full">
                <div className="flex items-center justify-center gap-2">
                  <ListChecks size={18} />
                  <span>Проверка менторства</span>
                </div>
              </Link>
            </li>
          )}

          <li>
            <Link to="/groups" className="btn btn-accent w-full">
              <div className="flex items-center justify-center gap-2">
                <Users size={18} />
                <span>Группы</span>
              </div>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
