// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './layouts/MainLayout';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CeuRequestPage from './pages/CeuRequestPage';
import SupervisionRequestPage from './pages/SupervisionRequestPage';
import HistoryPage from './pages/HistoryPage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ceu/create', element: <CeuRequestPage /> },
      { path: 'supervision/create', element: <SupervisionRequestPage /> },
      { path: 'history', element: <HistoryPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
