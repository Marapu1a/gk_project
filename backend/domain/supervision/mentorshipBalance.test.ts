import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCumulativeMentorshipTotal } from './mentorshipBalance';

test('uses all confirmed mentorship hours when there is no correction', () => {
  assert.equal(
    resolveCumulativeMentorshipTotal({
      confirmed: [
        { value: 2, reviewedAt: new Date('2026-01-01T00:00:00Z') },
        { value: 3, reviewedAt: new Date('2026-02-01T00:00:00Z') },
      ],
    }),
    5,
  );
});

test('uses a mentorship correction as a baseline and adds later confirmations', () => {
  const correctionAt = new Date('2026-02-01T00:00:00Z');

  assert.equal(
    resolveCumulativeMentorshipTotal({
      correction: { mentor: 4, updatedAt: correctionAt },
      confirmed: [
        { value: 10, reviewedAt: new Date('2026-01-01T00:00:00Z') },
        { value: 3, reviewedAt: new Date('2026-03-01T00:00:00Z') },
      ],
    }),
    7,
  );
});
