import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcAutoRenewalSupervisionHours,
  calcAutoSupervisionHours,
  roundDownSupervisionHours,
} from './supervisionRequirements';
import { createSupervisionSchema } from '../schemas/supervision';

test('calculates standard supervision cumulatively in tenths', () => {
  assert.equal(
    calcAutoSupervisionHours({ groupName: 'Инструктор', practiceHours: 40 }),
    1.3,
  );
  assert.equal(
    calcAutoSupervisionHours({ groupName: 'Инструктор', practiceHours: 60 }),
    2,
  );
});

test('calculates renewal supervision in tenths', () => {
  assert.equal(
    calcAutoRenewalSupervisionHours({ groupName: 'Инструктор', practiceHours: 52 }),
    1.3,
  );
});

test('always rounds supervision down to the nearest tenth', () => {
  assert.equal(roundDownSupervisionHours(1.39), 1.3);
  assert.equal(roundDownSupervisionHours(1.3), 1.3);
  assert.equal(roundDownSupervisionHours(0.09), 0);
});

test('accepts only tenths in a new supervision distribution', () => {
  const request = {
    supervisorEmail: 'supervisor@example.com',
    entries: [{ type: 'IMPLEMENTING', value: 40 }],
    draftDistribution: {
      directIndividual: 1.3,
      directGroup: 0,
      nonObservingIndividual: 0,
      nonObservingGroup: 0,
    },
  };

  assert.equal(createSupervisionSchema.safeParse(request).success, true);
  assert.equal(
    createSupervisionSchema.safeParse({
      ...request,
      draftDistribution: { ...request.draftDistribution, directIndividual: 1.35 },
    }).success,
    false,
  );
});
