// src/App.tsx
import { Toaster } from 'sonner';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider';
import MainLayout from './layouts/MainLayout';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CeuReviewPage from './pages/CeuReviewPage';
// import GroupAssignmentPage from './pages/GroupAssignmentPage';
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
import DashboardPageV2 from './pages/DashboardPageV2';
import SupervisionHoursPage from './pages/SupervisionHoursPage';
import CeuPointsPage from './pages/CeuPointsPage';
import ReviewerCandidatesPage from './pages/ReviewerCandidatesPage';
import ReviewerCandidateDetailsPage from './pages/ReviewerCandidateDetailsPage';
import ProfileEditPage from './pages/ProfileEditPage';
import AdminUserBannerPage from './pages/AdminUserBannerPage';
import AdminSupervisionCandidatesPage from './pages/AdminSupervisionCandidatesPage';

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
      { path: 'dashboard', element: <Navigate to="/dashboard-v2" replace /> },
      { path: 'dashboard-v2', element: <DashboardPageV2 /> },
      { path: 'profile', element: <ProfileEditPage /> },
      { path: 'reviewer/candidates/:kind', element: <ReviewerCandidatesPage /> },
      { path: 'reviewer/candidates/:kind/:userId', element: <ReviewerCandidateDetailsPage /> },
      { path: 'ceu/points', element: <CeuPointsPage /> },
      { path: 'ceu/create', element: <Navigate to="/ceu/points" replace /> },
      { path: 'supervision/hours', element: <SupervisionHoursPage /> },
      { path: 'supervision/create', element: <Navigate to="/supervision/hours" replace /> },
      { path: 'history', element: <Navigate to="/supervision/hours?panel=history" replace /> },
      { path: 'review/supervision', element: <Navigate to="/reviewer/candidates/supervision" replace /> },
      { path: 'review/ceu', element: <CeuReviewPage /> },
      // { path: 'groups', element: <GroupAssignmentPage /> },
      { path: 'document-review', element: <DocumentReviewPage /> },
      { path: 'admin/document-review', element: <AdminDocumentReviewListPage /> },
      { path: 'admin/document-review/:id', element: <AdminDocumentReviewDetailsPage /> },
      { path: 'admin/user-banner', element: <AdminUserBannerPage /> },
      { path: 'admin/supervision-candidates', element: <AdminSupervisionCandidatesPage /> },
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
      <ConfirmProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" toastOptions={{ duration: 3500 }} />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
