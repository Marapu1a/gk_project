// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './layouts/MainLayout';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CeuRequestPage from './pages/CeuRequestPage';
import SupervisionRequestPage from './pages/SupervisionRequestPage';
import HistoryPage from './pages/HistoryPage';
import SupervisionReviewPage from './pages/SupervisionReviewPage';
import CeuReviewPage from './pages/CeuReviewPage';
import GroupAssignmentPage from './pages/GroupAssignmentPage';
import MentorshipReviewPage from './pages/MentorshipReviewPage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ceu/create', element: <CeuRequestPage /> },
      { path: 'supervision/create', element: <SupervisionRequestPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'review/supervision', element: <SupervisionReviewPage /> },
      { path: 'review/mentorship', element: <MentorshipReviewPage /> },
      { path: 'review/ceu', element: <CeuReviewPage /> },
      { path: 'groups', element: <GroupAssignmentPage /> },
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
