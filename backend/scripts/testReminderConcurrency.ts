import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { prisma } from '../lib/prisma';
import * as mailer from '../lib/mailer';
import { deliverReviewerReminder } from '../utils/reviewerReminderDelivery';

async function main() {
  if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Local DB only');
  // Replace SMTP before any delivery. No network email calls in parent or children.
  let sends = 0;
  (mailer as any).sendEmail = async () => { sends++; };
  const childId = process.argv[2];
  const reviewerId = childId || `concurrency-fixture-${randomUUID()}`;
  if (!/^concurrency-fixture-[0-9a-f-]{36}$/.test(reviewerId)) throw new Error('Invalid fixture ID');
  const snapshot = { reviewerId, fullName: 'Concurrency fixture', email: 'fixture@example.invalid',
    tasks: [{ id: 'fixture-task', kind: 'hours' as const, createdAt: new Date().toISOString() }] };
  if (childId) {
    const result = await deliverReviewerReminder(snapshot, 'concurrency-test', false);
    console.log(JSON.stringify({ result, sends }));
    return;
  }
  function child(): Promise<{ result: string; sends: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [__filename, reviewerId], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      let out = ''; let err = '';
      proc.stdout.on('data', (data) => { out += data; });
      proc.stderr.on('data', (data) => { err += data; });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code !== 0) reject(new Error(err));
        else { try { resolve(JSON.parse(out.trim())); } catch (error) { reject(error); } }
      });
    });
  }
  try {
    const settled = await Promise.allSettled(Array.from({ length: 8 }, child));
    const results = settled.map((r) => { if (r.status === 'rejected') throw r.reason; return r.value; });
    assert.equal(results.filter((r) => r.result === 'SMTP_ACCEPTED').length, 1);
    assert.equal(results.reduce((sum, r) => sum + r.sends, 0), 1);
    assert.equal(await prisma.reviewerReminderLog.count({ where: { reviewerId } }), 1);
    assert.deepEqual(await child(), { result: 'DUPLICATE', sends: 0 });
    console.log('PASS: 8 processes, 1 journal row, 1 mocked send; restart skipped. Real emails: 0.');
  } finally {
    await prisma.reviewerReminderLog.deleteMany({ where: { reviewerId, slot: 'concurrency-test', intendedRecipient: 'fixture@example.invalid' } });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
