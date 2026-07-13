import { describe, expect, it } from 'vitest';
import {
  calculateExpectedSupervision,
  calculateIncrementalSupervision,
  calculateRemainingHours,
  getDistributionRuleError,
  getPracticeRuleError,
  parseHours,
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

  it('enforces the 40/40 practice distribution rule', () => {
    expect(getPracticeRuleError(40, 40)).toBeNull();
    expect(getPracticeRuleError(60, 40)).toBeNull();
    expect(getPracticeRuleError(70, 30)).toContain('не менее 40%');
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
