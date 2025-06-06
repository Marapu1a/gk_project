// components/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';

export default function MainLayout() {
  return (
    <>
      <SiteHeader />
      <main className="font-sans">
        <Outlet />
      </main>
    </>
  );
}
