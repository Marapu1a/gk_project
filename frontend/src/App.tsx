// src/App.tsx
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider';
import { AppRouteError } from '@/components/AppRouteError';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { queryClient } from '@/lib/queryClient';
import MainLayout from './layouts/MainLayout';

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CeuReviewPage = lazy(() => import('./pages/CeuReviewPage'));
const DocumentReviewPage = lazy(() => import('./pages/DocumentReviewPage'));
const AdminDocumentReviewListPage = lazy(() => import('./pages/AdminDocumentReviewListPage'));
const AdminDocumentReviewDetailsPage = lazy(() => import('./pages/AdminDocumentReviewDetailsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ExamApplicationsPage = lazy(() => import('./pages/ExamApplicationsPage'));
const UserDetailsPage = lazy(() => import('@/pages/UserDetailsPage'));
const CertificateIssuePage = lazy(() => import('@/pages/CertificateIssuePage'));
const MyCertificatesPage = lazy(() => import('@/pages/MyCertificatesPage'));
const RegistryPage = lazy(() => import('./pages/RegistryPage'));
const RegistryProfilePage = lazy(() => import('@/pages/RegistryProfilePage'));
const DashboardPageV2 = lazy(() => import('./pages/DashboardPageV2'));
const SupervisionHoursPage = lazy(() => import('./pages/SupervisionHoursPage'));
const CeuPointsPage = lazy(() => import('./pages/CeuPointsPage'));
const ReviewerCandidatesPage = lazy(() => import('./pages/ReviewerCandidatesPage'));
const ReviewerCandidateDetailsPage = lazy(() => import('./pages/ReviewerCandidateDetailsPage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const AdminUserBannerPage = lazy(() => import('./pages/AdminUserBannerPage'));
const AdminSupervisionCandidatesPage = lazy(() => import('./pages/AdminSupervisionCandidatesPage'));
const AdminExternalSupervisorClaimsPage = lazy(() => import('./pages/AdminExternalSupervisorClaimsPage'));
const SpecialistMessagesPage = lazy(() => import('./pages/SpecialistMessagesPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));

function RootRedirect() {
  const target = localStorage.getItem('token') ? '/dashboard-v2' : '/login';
  return <Navigate to={target} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <AppRouteError />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'registry', element: <RegistryPage /> },
      { path: 'registry/:userId', element: <RegistryProfilePage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <Navigate to="/dashboard-v2" replace /> },
          { path: 'dashboard-v2', element: <DashboardPageV2 /> },
          { path: 'profile', element: <ProfileEditPage /> },
          { path: 'ceu/points', element: <CeuPointsPage /> },
          { path: 'ceu/create', element: <Navigate to="/ceu/points" replace /> },
          { path: 'supervision/hours', element: <SupervisionHoursPage /> },
          { path: 'supervision/create', element: <Navigate to="/supervision/hours" replace /> },
          { path: 'history', element: <Navigate to="/supervision/hours?panel=history" replace /> },
          { path: 'specialist-messages', element: <SpecialistMessagesPage /> },
          { path: 'document-review', element: <DocumentReviewPage /> },
          { path: 'my-certificate', element: <MyCertificatesPage /> },
          { path: 'access-denied', element: <AccessDeniedPage /> },
        ],
      },
      {
        element: <ProtectedRoute access="reviewer" />,
        children: [
          { path: 'reviewer/candidates/:kind', element: <ReviewerCandidatesPage /> },
          { path: 'reviewer/candidates/:kind/:userId', element: <ReviewerCandidateDetailsPage /> },
          {
            path: 'review/supervision',
            element: <Navigate to="/reviewer/candidates/supervision" replace />,
          },
        ],
      },
      {
        element: <ProtectedRoute access="admin" />,
        children: [
          { path: 'review/ceu', element: <CeuReviewPage /> },
          { path: 'admin/document-review', element: <AdminDocumentReviewListPage /> },
          { path: 'admin/document-review/:id', element: <AdminDocumentReviewDetailsPage /> },
          { path: 'admin/user-banner', element: <AdminUserBannerPage /> },
          { path: 'admin/supervision-candidates', element: <AdminSupervisionCandidatesPage /> },
          { path: 'admin/qualification-claims', element: <AdminExternalSupervisorClaimsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'admin/users/:id', element: <UserDetailsPage /> },
          { path: 'exam-applications', element: <ExamApplicationsPage /> },
          { path: 'certificate', element: <CertificateIssuePage /> },
        ],
      },
    ],
  },
]);

function PageFallback() {
  return (
    <div className="container-fixed p-6">
      <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Suspense fallback={<PageFallback />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster
          position="top-center"
          offset={{ top: 96, right: 20, bottom: 20, left: 20 }}
          mobileOffset={{
            top: 'calc(12px + env(safe-area-inset-top))',
            left: 12,
            right: 12,
          }}
          visibleToasts={3}
          toastOptions={{ duration: 4000 }}
        />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
