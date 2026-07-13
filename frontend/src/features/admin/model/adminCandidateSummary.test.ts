import { describe, expect, it } from 'vitest';
import type { AdminUserDetails } from '../api/getUserDetails';
import { buildAdminCandidateSummary } from './adminCandidateSummary';

const NOW = '2026-07-13T12:00:00.000Z';

function makeUser(overrides: Partial<AdminUserDetails> = {}): AdminUserDetails {
  return {
    id: 'user-1',
    email: 'user@example.com',
    registrationNumber: null,
    fullName: 'Тест Пользователь',
    fullNameLatin: null,
    phone: null,
    birthDate: null,
    country: null,
    city: null,
    avatarUrl: null,
    ibaoId: null,
    isProfileVisible: true,
    isEmailConfirmed: true,
    role: 'STUDENT',
    createdAt: NOW,
    archivedAt: null,
    archivedById: null,
    archiveReason: null,
    archiveRequestedAt: null,
    archiveRequestReason: null,
    externalSupervisorClaimStatus: 'NONE',
    externalSupervisorClaimedAt: null,
    externalSupervisorClaimReviewedAt: null,
    externalSupervisorClaimReviewedBy: null,
    targetLevel: null,
    targetLockRank: null,
    activeCycle: null,
    activeCycleExamApplication: null,
    examReadiness: null,
    latestCertificate: null,
    groups: [],
    reviewerCandidateRelations: [],
    reviewerWorkload: {
      supervisionPendingRequests: 0,
      mentorshipPendingRequests: 0,
    },
    certificates: [],
    payments: [],
    ceuRecords: [],
    supervisionRecords: [],
    uploadedFiles: [],
    documentReviewRequests: [],
    ...overrides,
  };
}

function makeCertificationReadiness(): NonNullable<AdminUserDetails['examReadiness']> {
  return {
    ready: true,
    missing: [],
    ceu: {
      ready: true,
      current: { ethics: 0, cultDiver: 0, supervision: 0, general: 10, total: 10 },
      required: { ethics: 0, cultDiver: 0, supervision: 0, general: 10, total: 10 },
    },
    supervision: {
      ready: true,
      current: { practice: 100, supervision: 10, mentor: 0 },
      required: { practice: 100, supervision: 10, supervisor: 0 },
    },
    documents: { ready: true, request: null },
    payments: {
      ready: true,
      items: [
        {
          type: 'EXAM_ACCESS',
          label: 'Допуск к экзамену',
          paid: true,
          requestedAt: NOW,
          confirmedAt: NOW,
        },
      ],
    },
  };
}

function makeActiveCycle(
  type: 'CERTIFICATION' | 'RENEWAL' = 'CERTIFICATION',
): NonNullable<AdminUserDetails['activeCycle']> {
  return {
    id: 'cycle-active',
    type,
    status: 'ACTIVE',
    targetLevel: 'SUPERVISOR',
    startedAt: NOW,
    endedAt: null,
  };
}

function makeApprovedExamApplication(): NonNullable<
  AdminUserDetails['activeCycleExamApplication']
> {
  return {
    id: 'exam-1',
    cycleId: 'cycle-active',
    status: 'APPROVED',
    createdAt: NOW,
    updatedAt: NOW,
    cycle: null,
  };
}

describe('buildAdminCandidateSummary', () => {
  it('keeps reviewer work visible without an active candidate cycle', () => {
    const result = buildAdminCandidateSummary(
      makeUser({
        reviewerWorkload: {
          supervisionPendingRequests: 2,
          mentorshipPendingRequests: 0,
        },
      }),
      'Супервизор',
    );

    expect(result.summaryLines).toEqual([]);
    expect(result.reviewerLines).toEqual([
      expect.objectContaining({ label: 'Проверка часов', value: 2, tone: 'warn' }),
    ]);
    expect(result.requiresAttention).toBe(true);
  });

  it('marks a fully completed certification cycle as ready', () => {
    const result = buildAdminCandidateSummary(
      makeUser({
        activeCycle: makeActiveCycle(),
        activeCycleExamApplication: makeApprovedExamApplication(),
        examReadiness: makeCertificationReadiness(),
      }),
      'Куратор',
    );

    expect(result.summaryLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Документы', tone: 'good' }),
        expect.objectContaining({ label: 'CEU-баллы', value: '10 / 10', tone: 'good' }),
        expect.objectContaining({ label: 'Оплаты', value: 'Оплачено', tone: 'good' }),
        expect.objectContaining({ label: 'Заявка на экзамен', tone: 'good' }),
      ]),
    );
    expect(result.requiresAttention).toBe(false);
  });

  it('counts only unconfirmed hours from the active cycle', () => {
    const result = buildAdminCandidateSummary(
      makeUser({
        activeCycle: makeActiveCycle(),
        activeCycleExamApplication: makeApprovedExamApplication(),
        examReadiness: makeCertificationReadiness(),
        supervisionRecords: [
          {
            id: 'record-active',
            cycleId: 'cycle-active',
            fileId: null,
            createdAt: NOW,
            hours: [
              {
                id: 'hour-supervision',
                type: 'INDIVIDUAL',
                value: 1,
                status: 'UNCONFIRMED',
                reviewedAt: null,
                rejectedReason: null,
                reviewer: null,
              },
              {
                id: 'hour-mentorship',
                type: 'SUPERVISOR',
                value: 1,
                status: 'UNCONFIRMED',
                reviewedAt: null,
                rejectedReason: null,
                reviewer: null,
              },
            ],
          },
          {
            id: 'record-old',
            cycleId: 'cycle-old',
            fileId: null,
            createdAt: NOW,
            hours: [
              {
                id: 'hour-old',
                type: 'INDIVIDUAL',
                value: 1,
                status: 'UNCONFIRMED',
                reviewedAt: null,
                rejectedReason: null,
                reviewer: null,
              },
            ],
          },
        ],
      }),
      'Куратор',
    );

    expect(result.summaryLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Заявки часов на проверке', value: 1, tone: 'warn' }),
      ]),
    );
    expect(result.summaryLines).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Заявки менторства на проверке' }),
      ]),
    );
    expect(result.requiresAttention).toBe(true);
  });

  it('uses the renewal payment and omits document review for renewal cycles', () => {
    const result = buildAdminCandidateSummary(
      makeUser({
        activeCycle: makeActiveCycle('RENEWAL'),
        activeCycleExamApplication: makeApprovedExamApplication(),
        examReadiness: {
          ...makeCertificationReadiness(),
          ceu: {
            ready: true,
            current: { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 },
            required: null,
          },
          supervision: {
            ready: true,
            current: { practice: 0, supervision: 0, mentor: 0 },
            required: null,
          },
          payments: { ready: false, items: [] },
        },
        payments: [
          {
            id: 'payment-1',
            type: 'RENEWAL',
            targetLevel: 'SUPERVISOR',
            status: 'PENDING',
            comment: null,
            createdAt: NOW,
            requestedAt: NOW,
            confirmedAt: null,
          },
        ],
      }),
      'Опытный Супервизор',
    );

    expect(result.summaryLines).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Документы' })]),
    );
    expect(result.summaryLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Оплата ресертификации',
          value: 'На подтверждении',
          tone: 'warn',
        }),
      ]),
    );
    expect(result.reviewerLines.map((line) => line.label)).toEqual([
      'Проверка часов',
      'Проверка менторства',
    ]);
    expect(result.requiresAttention).toBe(true);
  });
});
