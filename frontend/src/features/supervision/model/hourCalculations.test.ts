import { describe, expect, it } from 'vitest';
import {
  calculateExpectedSupervision,
  calculateIncrementalSupervision,
  calculateRemainingHours,
  calculateUndistributedSupervision,
  getDistributionAvailability,
  getDistributionRuleError,
  getCumulativePracticeRuleError,
  getIncrementalSupervisionBreakdown,
  getPracticeRequirementState,
  parseHours,
  resolvePracticeBalance,
  sanitizeHoursInput,
  summarizeSupervisionDistribution,
} from './hourCalculations';

describe('hourCalculations', () => {
  it('parses decimal hours and rejects invalid or negative input', () => {
    expect(parseHours('12,5')).toBe(12.5);
    expect(parseHours('-3')).toBe(0);
    expect(parseHours('abc')).toBe(0);
  });

  it('limits supervision distribution input to tenths', () => {
    expect(sanitizeHoursInput('1,3', 1)).toBe('1,3');
    expect(sanitizeHoursInput('1,35', 1)).toBeNull();
  });

  it('calculates the remaining hours without going below zero', () => {
    expect(calculateRemainingHours(75, 20.25, 4.5)).toBe(50.25);
    expect(calculateRemainingHours(10, 7, 5)).toBe(0);
    expect(calculateRemainingHours(null, 5)).toBeNull();
  });

  it('calculates total supervision and caps it at the requirement', () => {
    expect(
      calculateExpectedSupervision({
        practice: 1500,
        requiredPractice: 1500,
        requiredSupervision: 75,
      }),
    ).toBe(75);
    expect(
      calculateExpectedSupervision({
        practice: 3000,
        requiredPractice: 1500,
        requiredSupervision: 75,
      }),
    ).toBe(75);
  });

  it('calculates only supervision unlocked by newly added practice', () => {
    expect(
      calculateIncrementalSupervision({
        basePractice: 19,
        addedPractice: 21,
        baseDistributedSupervision: 0,
        requiredPractice: 1500,
        requiredSupervision: 75,
      }),
    ).toBe(2);
    expect(
      calculateIncrementalSupervision({
        basePractice: 0,
        addedPractice: 100,
        baseDistributedSupervision: 0,
        requiredPractice: 1500,
        requiredSupervision: 75,
        remainingSupervision: 3,
      }),
    ).toBe(3);
  });

  it('calculates tenths cumulatively and returns the previous remainder later', () => {
    expect(
      calculateIncrementalSupervision({
        basePractice: 0,
        addedPractice: 40,
        baseDistributedSupervision: 0,
        requiredPractice: 300,
        requiredSupervision: 10,
      }),
    ).toBe(1.3);
    expect(
      calculateIncrementalSupervision({
        basePractice: 40,
        addedPractice: 20,
        baseDistributedSupervision: 1.3,
        requiredPractice: 300,
        requiredSupervision: 10,
      }),
    ).toBe(0.7);
  });

  it('makes an undistributed legacy remainder available with the next request', () => {
    expect(
      calculateIncrementalSupervision({
        basePractice: 19,
        addedPractice: 1,
        baseDistributedSupervision: 0,
        requiredPractice: 300,
        requiredSupervision: 10,
      }),
    ).toBe(0.6);
  });

  it('explains the previous remainder separately from supervision earned by current practice', () => {
    expect(
      getIncrementalSupervisionBreakdown({
        baseEntitlement: 6,
        baseDistributedSupervision: 5,
        expectedSupervision: 2,
      }),
    ).toEqual({
      fromPreviousPractice: 1,
      fromCurrentPractice: 1,
    });
  });

  it('does not offer a previous remainder again when a pending request already distributed it', () => {
    expect(
      calculateIncrementalSupervision({
        basePractice: 140,
        addedPractice: 20,
        baseDistributedSupervision: 7,
        requiredPractice: 1500,
        requiredSupervision: 75,
      }),
    ).toBe(1);
    expect(
      getIncrementalSupervisionBreakdown({
        baseEntitlement: 7,
        baseDistributedSupervision: 7,
        expectedSupervision: 1,
      }),
    ).toEqual({
      fromPreviousPractice: 0,
      fromCurrentPractice: 1,
    });
  });

  it('does not show a remainder that is already included in a pending request', () => {
    expect(
      calculateUndistributedSupervision({
        confirmedEntitlement: 6,
        pendingEntitlement: 1,
        confirmedDistribution: 5,
        pendingDistribution: 2,
      }),
    ).toBe(0);
    expect(
      calculateUndistributedSupervision({
        confirmedEntitlement: 6,
        pendingEntitlement: 0,
        confirmedDistribution: 5,
        pendingDistribution: 0,
      }),
    ).toBe(1);
  });

  it('checks the 40/40/20 rule against the accumulated cycle total', () => {
    expect(
      getCumulativePracticeRuleError({
        requiredPractice: 1500,
        currentImplementing: 0,
        currentProgramming: 0,
        addedImplementing: 750,
        addedProgramming: 0,
      }),
    ).toBeNull();
    expect(
      getCumulativePracticeRuleError({
        requiredPractice: 1500,
        currentImplementing: 750,
        currentProgramming: 0,
        addedImplementing: 151,
        addedProgramming: 0,
      }),
    ).toContain('не более 900');
  });

  it('combines current hours with neutral legacy and bonus hours', () => {
    expect(
      resolvePracticeBalance({
        implementing: 350,
        programming: 250,
        neutralHours: 500.01,
      }),
    ).toEqual({ implementing: 600.01, programming: 500 });
  });

  it('distinguishes a completed total from a completed 40/40/20 balance', () => {
    expect(
      getPracticeRequirementState({
        requiredPractice: 1500,
        implementing: 900,
        programming: 600,
      }),
    ).toMatchObject({ totalComplete: true, balanceComplete: true, complete: true });
    expect(
      getPracticeRequirementState({
        requiredPractice: 1500,
        implementing: 950,
        programming: 550,
      }),
    ).toMatchObject({ totalComplete: true, balanceComplete: false, complete: false });
  });

  it('rounds fractional artifacts consistently with the backend', () => {
    expect(
      getPracticeRequirementState({
        requiredPractice: 1500,
        implementing: 600 - Number.EPSILON,
        programming: 900,
      }).complete,
    ).toBe(true);
  });

  it('summarizes and validates supervision distribution', () => {
    const summary = summarizeSupervisionDistribution(
      {
        directIndividual: 2,
        directGroup: 1,
        nonObservingIndividual: 1,
        nonObservingGroup: 1,
      },
      5,
    );

    expect(summary).toEqual({
      directTotal: 3,
      nonObservingTotal: 2,
      distributionTotal: 5,
      groupTotal: 2,
      distributionRemaining: 0,
    });
    expect(getDistributionRuleError({ expectedSupervision: 5, ...summary })).toBeNull();
    expect(
      getDistributionRuleError({
        expectedSupervision: 5,
        distributionTotal: 5,
        groupTotal: 3,
        distributionRemaining: 0,
      }),
    ).toContain('не более 50%');
  });

  it('applies the 50 percent group limit to fractional supervision', () => {
    expect(
      getDistributionRuleError({
        expectedSupervision: 1,
        distributionTotal: 1,
        groupTotal: 0.5,
        distributionRemaining: 0,
      }),
    ).toBeNull();
    expect(
      getDistributionRuleError({
        expectedSupervision: 1,
        distributionTotal: 1,
        groupTotal: 0.6,
        distributionRemaining: 0,
      }),
    ).toContain('не более 50%');
  });

  it('does not allow repeated fractional requests to overfill the group basket', () => {
    expect(
      getDistributionRuleError({
        expectedSupervision: 0.7,
        distributionTotal: 0.7,
        groupTotal: 0.5,
        distributionRemaining: 0,
        baseSupervision: 1.3,
        baseGroup: 0.6,
      }),
    ).toContain('не более 50%');
    expect(
      getDistributionRuleError({
        expectedSupervision: 0.7,
        distributionTotal: 0.7,
        groupTotal: 0.4,
        distributionRemaining: 0,
        baseSupervision: 1.3,
        baseGroup: 0.5,
      }),
    ).toBeNull();
  });

  it('links distribution sections to the matching practice types', () => {
    expect(getDistributionAvailability({ implementing: 10, programming: 0 })).toEqual({
      directEnabled: true,
      nonObservingEnabled: false,
    });
    expect(getDistributionAvailability({ implementing: 0, programming: 10 })).toEqual({
      directEnabled: false,
      nonObservingEnabled: true,
    });
    expect(getDistributionAvailability({ implementing: 10, programming: 10 })).toEqual({
      directEnabled: true,
      nonObservingEnabled: true,
    });
  });
});
