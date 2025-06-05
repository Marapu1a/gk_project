// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import LoginPage from './pages/LoginPage';
import TestAuth from './features/auth/TestAuth';
import AuthRedirect from './features/auth/AuthRedirect';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

const router = createBrowserRouter([
  { path: '/', element: <AuthRedirect /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/login', element: <LoginPage /> },
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
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
