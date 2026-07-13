export type DashboardHoursMode = 'supervision' | 'mentorship';

type DashboardSectionsInput = {
  activeGroupName: string;
  hasCertificationAccess: boolean;
};

export type DashboardSections = {
  showCertificationContent: boolean;
  hoursMode: DashboardHoursMode | null;
  showCeu: boolean;
  showReviewerWork: boolean;
};

export function resolveDashboardSections({
  activeGroupName,
  hasCertificationAccess,
}: DashboardSectionsInput): DashboardSections {
  const isSupervisor = activeGroupName === 'Супервизор';
  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';

  return {
    showCertificationContent: hasCertificationAccess,
    hoursMode:
      hasCertificationAccess && !isExperiencedSupervisor
        ? isSupervisor
          ? 'mentorship'
          : 'supervision'
        : null,
    showCeu: hasCertificationAccess,
    showReviewerWork: isSupervisor || isExperiencedSupervisor,
  };
}
