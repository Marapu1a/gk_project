// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';

export default function MainLayout() {
  return (
    <div>
      <SiteHeader />
      <main className="container-fixed mx-auto py-8">
        <Outlet />
      </main>
    </div>
  );
}
