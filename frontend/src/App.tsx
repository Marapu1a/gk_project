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
import DocumentReviewPage from './pages/DocumentReviewPage';
import AdminDocumentReviewListPage from './pages/AdminDocumentReviewListPage';
import AdminDocumentReviewDetailsPage from './pages/AdminDocumentReviewDetailsPage';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from '@/pages/UserDetailsPage';

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
      { path: 'document-review', element: <DocumentReviewPage /> },
      { path: 'admin/document-review', element: <AdminDocumentReviewListPage /> },
      { path: 'admin/document-review/:id', element: <AdminDocumentReviewDetailsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'admin/users/:id', element: <UserDetailsPage /> },
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
