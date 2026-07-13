import { describe, expect, it } from 'vitest';
import { resolveDashboardSections } from './dashboardSections';

describe('resolveDashboardSections', () => {
  it('shows certification hours and CEU to a regular user with access', () => {
    expect(
      resolveDashboardSections({
        activeGroupName: 'Куратор',
        hasCertificationAccess: true,
      }),
    ).toEqual({
      showCertificationContent: true,
      hoursMode: 'supervision',
      showCeu: true,
      showReviewerWork: false,
    });
  });

  it('switches a supervisor from supervision hours to mentorship hours', () => {
    expect(
      resolveDashboardSections({
        activeGroupName: 'Супервизор',
        hasCertificationAccess: true,
      }),
    ).toEqual({
      showCertificationContent: true,
      hoursMode: 'mentorship',
      showCeu: true,
      showReviewerWork: true,
    });
  });

  it('hides hour collection from an experienced supervisor but keeps reviewer work', () => {
    expect(
      resolveDashboardSections({
        activeGroupName: 'Опытный Супервизор',
        hasCertificationAccess: true,
      }),
    ).toEqual({
      showCertificationContent: true,
      hoursMode: null,
      showCeu: true,
      showReviewerWork: true,
    });
  });

  it('hides certification blocks without payment access but does not lock reviewer work', () => {
    expect(
      resolveDashboardSections({
        activeGroupName: 'Супервизор',
        hasCertificationAccess: false,
      }),
    ).toEqual({
      showCertificationContent: false,
      hoursMode: null,
      showCeu: false,
      showReviewerWork: true,
    });
  });
});
