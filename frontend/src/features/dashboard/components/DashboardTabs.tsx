import { Link } from 'react-router-dom';
import { BookOpenCheck, Timer, Clock, ListChecks, FileSearch, Users } from 'lucide-react';

type DashboardTabsProps = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
  };
};

export function DashboardTabs({ user }: DashboardTabsProps) {
  return (
    <div className="bg-blue-soft border border-blue-dark/20 p-6 rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-blue-dark">Навигация</h2>

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
              <span>Добавить часы супервизии</span>
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

        {(user.role === 'REVIEWER' || user.role === 'ADMIN') && (
          <>
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

            <li>
              <Link to="/groups" className="btn btn-accent w-full">
                <div className="flex items-center justify-center gap-2">
                  <Users size={18} />
                  <span>Группы</span>
                </div>
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
