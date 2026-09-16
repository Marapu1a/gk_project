import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReviewerReminder, ReminderSnapshot } from './reviewerReminder';
import { reminderSlot } from './reviewerReminderSchedule';

const base: ReminderSnapshot = { reviewerId: '1', email: 'test@example.invalid', fullName: '<Проверяющий>', tasks: [] };
test('scheduled at 10 Moscow on 5th and 20th only', () => {
  assert.equal(reminderSlot(new Date('2026-10-05T06:59:00Z')), null);
  assert.equal(reminderSlot(new Date('2026-10-05T07:00:00Z')), '2026-10-05');
  assert.equal(reminderSlot(new Date('2026-10-20T07:00:00Z')), '2026-10-20');
  assert.equal(reminderSlot(new Date('2026-10-06T07:00:00Z')), null);
  assert.equal(reminderSlot(new Date('2026-10-05T21:00:00Z')), null);
});
test('empty snapshot skips the message', () => assert.equal(buildReviewerReminder(base), null));
test('deduplicates tasks and hides empty categories', () => {
  const task = { id: '1', kind: 'hours' as const, createdAt: '2026-09-16' };
  const result = buildReviewerReminder({ ...base, tasks: [task, task] })!;
  assert.equal(result.tasks.length, 1);
  assert.match(result.text, /заявки часов на проверку — 1\./);
  assert.doesNotMatch(result.text, /запросы на сотрудничество/);
  assert.equal(result.subject, 'ЦС ПАП: заявки ожидают решения');
  assert.match(result.text, /Добрый день, <Проверяющий>!/);
  assert.match(result.text, /служба поддержки ЦС «ПАП»/);
  assert.doesNotMatch(result.html, /<Проверяющий>/);
});
test('combines cooperation and hours and labels test messages', () => {
  const result = buildReviewerReminder({ ...base, tasks: [
    { id: '1', kind: 'hours', createdAt: '2026-09-16' },
    { id: '1', kind: 'cooperation', createdAt: '2026-09-16' },
  ] }, true)!;
  assert.equal(result.tasks.length, 2);
  assert.match(result.subject, /\[ТЕСТ\]/);
  assert.match(result.text, /запросы на сотрудничество — 1;\nзаявки часов на проверку — 1\./);
});
