import { describe, expect, it } from 'vitest';
import {
  calculateExpectedSupervision,
  calculateIncrementalSupervision,
  calculateRemainingHours,
  getDistributionRuleError,
  getCumulativePracticeRuleError,
  getPracticeRequirementState,
  parseHours,
  resolvePracticeBalance,
  summarizeSupervisionDistribution,
} from './hourCalculations';

describe('hourCalculations', () => {
  it('parses decimal hours and rejects invalid or negative input', () => {
    expect(parseHours('12,5')).toBe(12.5);
    expect(parseHours('-3')).toBe(0);
    expect(parseHours('abc')).toBe(0);
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
        requiredPractice: 1500,
        requiredSupervision: 75,
      }),
    ).toBe(2);
    expect(
      calculateIncrementalSupervision({
        basePractice: 0,
        addedPractice: 100,
        requiredPractice: 1500,
        requiredSupervision: 75,
        remainingSupervision: 3,
      }),
    ).toBe(3);
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
});
