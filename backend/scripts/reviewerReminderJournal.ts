import 'dotenv/config';
import { prisma } from '../lib/prisma';
import type { ReminderTask } from '../utils/reviewerReminder';

async function main() {
  const rows = await prisma.reviewerReminderLog.findMany({
    where: { isTest: false }, orderBy: { createdAt: 'desc' }, take: 100,
  });
  for (const row of rows) {
    const tasks = row.tasks as ReminderTask[];
    let processed = 0;
    let pending = 0;
    let unavailable = 0;
    for (const task of tasks) {
      if (task.kind === 'cooperation') {
        const relation = await prisma.reviewerCandidateRelation.findUnique({ where: { id: task.id } });
        if (!relation || relation.reviewerId !== row.reviewerId) unavailable++;
        else if (relation.status === 'PENDING') pending++;
        else processed++;
      } else {
        const hours = await prisma.supervisionHour.findMany({ where: { recordId: task.id, reviewerId: row.reviewerId } });
        if (!hours.length) unavailable++;
        else if (hours.some((hour) => hour.status === 'UNCONFIRMED')) pending++;
        else processed++;
      }
    }
    console.log(JSON.stringify({ name: row.fullName, email: row.intendedRecipient, date: row.createdAt,
      status: row.status, taskCount: tasks.length, processed, pending, unavailable,
      error: row.error }, null, 2));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
