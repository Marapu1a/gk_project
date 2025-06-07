import { Outlet, NavLink } from 'react-router-dom';

const tabs = [
  { label: 'Главная', to: '/dashboard' },
  { label: 'Мои заявки', to: '/dashboard/requests' },
  { label: 'Создать заявку', to: '/dashboard/request/new' },
];

export default function DashboardLayout() {
  return (
    <div className="p-4 space-y-4">
      <nav className="flex gap-3 border-b pb-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              isActive
                ? 'text-white bg-brand px-3 py-1 rounded'
                : 'text-gray-700 hover:underline px-3 py-1'
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
