import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as mailer from '../lib/mailer';
import { deliverReviewerReminder } from './reviewerReminderDelivery';

test('delivery: duplicates, restart, failures, test isolation and empty snapshots', async (t) => {
  const rows = new Map<string, any>();
  const sent: string[] = [];
  let smtpFails = false;
  let updateFails = false;
  function stub(target: any, key: string, value: any) {
    const original = target[key]; target[key] = value;
    t.after(() => { target[key] = original; });
  }
  stub(prisma.reviewerReminderLog, 'create', async ({ data }: any) => {
    if (rows.has(data.dedupeKey)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.8.2' });
    const row = { ...data, id: data.dedupeKey, status: 'SENDING' };
    rows.set(data.dedupeKey, row);
    return row;
  });
  stub(prisma.reviewerReminderLog, 'update', async ({ where, data }: any) => {
    if (updateFails) throw new Error('database unavailable');
    Object.assign(rows.get(where.id), data);
  });
  stub(mailer, 'sendEmail', async ({ to }: any) => {
    sent.push(to);
    if (smtpFails) throw Object.assign(new Error('SMTP timeout'), { cause: { code: 'ETIMEDOUT' } });
  });
  const snapshot = { reviewerId: 'fixture', fullName: 'Fixture', email: 'never-send@example.invalid',
    tasks: [{ id: 'task', kind: 'hours' as const, createdAt: '2026-09-16' }] };
  const outcomes = await Promise.all([
    deliverReviewerReminder(snapshot, '2026-10-05', false),
    deliverReviewerReminder(snapshot, '2026-10-05', false),
  ]);
  assert.deepEqual(outcomes.sort(), ['DUPLICATE', 'SMTP_ACCEPTED']);
  assert.equal(sent.length, 1);
  assert.equal(await deliverReviewerReminder(snapshot, '2026-10-05', false), 'DUPLICATE');
  assert.equal(sent.length, 1);
  assert.equal(await deliverReviewerReminder(snapshot, '2026-10-20', false), 'SMTP_ACCEPTED');
  assert.equal(sent.length, 2);
  smtpFails = true;
  assert.equal(await deliverReviewerReminder(snapshot, '2026-11-05', false), 'ERROR_OR_UNKNOWN');
  assert.equal(await deliverReviewerReminder(snapshot, '2026-11-05', false), 'DUPLICATE');
  assert.equal(sent.length, 3);
  smtpFails = false;
  updateFails = true;
  await assert.rejects(deliverReviewerReminder(snapshot, '2026-11-20', false), /database unavailable/);
  assert.equal(rows.get('2026-11-20:fixture').status, 'SENDING');
  updateFails = false;
  assert.equal(await deliverReviewerReminder(snapshot, '2026-11-20', false), 'DUPLICATE');
  assert.equal(sent.length, 4);
  await deliverReviewerReminder(snapshot, '2026-10-05', true);
  assert.equal(sent.at(-1), 'marapulets87@yandex.ru');
  assert.equal([...rows.values()].filter((row) => row.isTest).length, 1);
  assert.equal(await deliverReviewerReminder({ ...snapshot, tasks: [] }, 'empty', false), 'EMPTY');
  assert.equal(sent.length, 5);
});
