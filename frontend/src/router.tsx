import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LoginPage from './pages/LoginPage';
import TestAuth from './features/auth/TestAuth';
import AuthRedirect from './features/auth/AuthRedirect';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import MainLayout from './components/MainLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <AuthRedirect /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },

      {
        path: 'dashboard',
        element: <ProtectedRoute />,
        children: [{ index: true, element: <TestAuth /> }],
      },

      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          {
            index: true,
            element: <div className="p-6 text-xl">Добро пожаловать, Админ!</div>,
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
