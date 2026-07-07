import { Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F0F0F0]">
      <SiteHeader />

      <main className="container-fixed mx-auto w-full flex-1 py-4">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
