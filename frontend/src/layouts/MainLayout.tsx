import { Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="container-fixed mx-auto py-8 flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
