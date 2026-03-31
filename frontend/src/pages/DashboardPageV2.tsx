// src/pages/DashboardPageV2.tsx
import { DashboardV2 } from '@/features/dashboard-v2/dashboardV2/components/DashboardV2';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function DashboardPageV2() {
  return (
    <ProtectedRoute>
      <DashboardV2 />
    </ProtectedRoute>
  );
}
