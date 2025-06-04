// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import { LoginForm } from './features/auth/LoginForm';
import TestAuth from './features/auth/TestAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

const router = createBrowserRouter([
  { path: '/register', element: <RegisterPage /> },
  { path: '/login', element: <LoginForm /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'dashboard',
        element: <TestAuth />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute />,
    children: [
      {
        path: '',
        element: <div className="p-6 text-xl">Добро пожаловать, Админ!</div>,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
