import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { reviewerRemindersHandler } from './reviewerReminders';

test('history hides test mail, classifies missing tasks separately and exports XLSX', async (t) => {
  // Prisma delegates are proxies: node:test mock.method cannot inspect their descriptors.
  function stub(target: any, key: string, replacement: (...args: any[]) => unknown) {
    const original = target[key];
    target[key] = replacement;
    t.after(() => { target[key] = original; });
  }
  const now = new Date('2026-09-16T10:00:00Z');
  stub(prisma.reviewerReminderLog, 'count', async (args: any) => {
    assert.equal(args.where.isTest, false);
    return 1;
  });
  stub(prisma.reviewerReminderLog, 'findMany', async () => [{
    id: 'log', reviewerId: 'reviewer', fullName: 'Проверяющий', intendedRecipient: 'test@example.invalid',
    recipient: 'test@example.invalid', createdAt: now, status: 'SMTP_ACCEPTED', isTest: false,
    tasks: [
      { id: 'pending', kind: 'cooperation', createdAt: now.toISOString() },
      { id: 'done', kind: 'hours', createdAt: now.toISOString() },
      { id: 'missing', kind: 'hours', createdAt: now.toISOString() },
    ],
  }]);
  stub(prisma.reviewerCandidateRelation, 'findMany', async () => [
    { id: 'pending', reviewerId: 'reviewer', status: 'PENDING', candidate: { fullName: 'Кандидат' } },
  ]);
  stub(prisma.supervisionHour, 'findMany', async () => [
    { recordId: 'done', reviewerId: 'reviewer', status: 'CONFIRMED', record: { user: { fullName: 'Кандидат' } } },
    { recordId: 'done', reviewerId: 'reviewer', status: 'CONFIRMED', record: { user: { fullName: 'Кандидат' } } },
  ]);
  const response: any = await reviewerRemindersHandler({ query: { view: 'history' } } as any, {} as any);
  assert.equal(response.rows[0].pending, 1);
  assert.equal(response.rows[0].processed, 1);
  assert.equal(response.rows[0].unavailable, 1);
  assert.equal(response.rows[0].count, 3);
  let output: Buffer | undefined;
  const reply: any = { header() { return this; }, send(value: Buffer) { output = value; } };
  await reviewerRemindersHandler({ query: { view: 'history', export: 'xlsx' } } as any, reply);
  assert.ok(output);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(output as any);
  assert.equal(workbook.worksheets[0].rowCount, 2);
  assert.equal(workbook.worksheets[0].getCell('A2').value, 'Проверяющий');
});
