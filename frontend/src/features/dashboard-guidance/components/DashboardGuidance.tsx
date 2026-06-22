import type { CurrentUser } from '@/features/auth/api/me';
import { useDashboardGuidance } from '../hooks/useDashboardGuidance';
import { DashboardNextStepCard } from './DashboardNextStepCard';
import { DASHBOARD_GUIDANCE_CONFIG } from '../config';

type Props = {
  user: CurrentUser;
  hasCertificationAccess: boolean;
};

export function DashboardGuidance({ user, hasCertificationAccess }: Props) {
  const { step, isLoading } = useDashboardGuidance({ user, hasCertificationAccess });
  if (!DASHBOARD_GUIDANCE_CONFIG.enabled || isLoading || !step) return null;
  return <DashboardNextStepCard step={step} />;
}
