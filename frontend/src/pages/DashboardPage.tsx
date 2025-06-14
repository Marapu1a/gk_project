// src/pages/DashboardPage.tsx
import { Dashboard } from '../features/dashboard/components/Dashboard';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
