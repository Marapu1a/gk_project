import 'dotenv/config';
import { buildReviewerReminder, ReminderSnapshot } from '../utils/reviewerReminder';

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--mock', '--empty', '--html', '--send-test'].includes(arg))) {
    throw new Error('Разрешены только --mock, --empty, --html, --send-test.');
  }
  if (args.includes('--send-test') && !args.includes('--mock')) {
    throw new Error('Отправка теста разрешена только с --mock: одно письмо на фиксированный адрес.');
  }
  let snapshots: ReminderSnapshot[];
  if (args.includes('--mock')) {
    snapshots = [{ reviewerId: 'mock', fullName: 'Тестовый проверяющий', email: 'reviewer@example.invalid',
      tasks: args.includes('--empty') ? [] : [
        { id: 'relation-1', kind: 'cooperation', createdAt: new Date().toISOString() },
        { id: 'record-1', kind: 'hours', createdAt: new Date().toISOString() },
      ] }];
  } else {
    const { collectReviewerReminders } = await import('../utils/reviewerReminderSnapshot');
    const { prisma } = await import('../lib/prisma');
    try { snapshots = await collectReviewerReminders(); }
    finally { await prisma.$disconnect(); }
  }
  for (const snapshot of snapshots) {
    const message = buildReviewerReminder(snapshot, true);
    if (args.includes('--send-test')) {
      const { deliverReviewerReminder } = await import('../utils/reviewerReminderDelivery');
      const { prisma } = await import('../lib/prisma');
      try {
        console.log(await deliverReviewerReminder(snapshot, 'manual-test', true));
      } finally { await prisma.$disconnect(); }
      continue;
    }
    console.log(JSON.stringify({ reviewerId: snapshot.reviewerId, intendedRecipient: snapshot.email,
      testRecipient: 'marapulets87@yandex.ru', sent: false,
      message: message ? (args.includes('--html') ? message.html : message.text) : null,
      tasks: message?.tasks ?? [], }, null, 2));
  }
  if (!snapshots.length) console.log('Нет ожидающих задач. Отправка не выполнялась.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
