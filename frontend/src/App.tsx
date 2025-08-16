// src/App.tsx
import { Toaster } from 'sonner';
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
import DocumentReviewPage from './pages/DocumentReviewPage';
import AdminDocumentReviewListPage from './pages/AdminDocumentReviewListPage';
import AdminDocumentReviewDetailsPage from './pages/AdminDocumentReviewDetailsPage';
import UsersPage from './pages/UsersPage';
import ExamApplicationsPage from './pages/ExamApplicationsPage';
import UserDetailsPage from '@/pages/UserDetailsPage';
import CertificateIssuePage from '@/pages/CertificateIssuePage';
import MyCertificatesPage from '@/pages/MyCertificatesPage';
import RegistryPage from './pages/RegistryPage';
import RegistryProfilePage from '@/pages/RegistryProfilePage';

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
      { path: 'review/ceu', element: <CeuReviewPage /> },
      { path: 'groups', element: <GroupAssignmentPage /> },
      { path: 'document-review', element: <DocumentReviewPage /> },
      { path: 'admin/document-review', element: <AdminDocumentReviewListPage /> },
      { path: 'admin/document-review/:id', element: <AdminDocumentReviewDetailsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'admin/users/:id', element: <UserDetailsPage /> },
      { path: 'exam-applications', element: <ExamApplicationsPage /> },
      { path: 'certificate', element: <CertificateIssuePage /> },
      { path: 'my-certificate', element: <MyCertificatesPage /> },
      { path: 'registry', element: <RegistryPage /> },
      { path: 'registry/:userId', element: <RegistryProfilePage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" toastOptions={{ duration: 3500 }} />
    </QueryClientProvider>
  );
}
