import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma';
import { collectReviewerReminders } from '../utils/reviewerReminderSnapshot';
import { getReviewerRequestsHandler } from '../handlers/supervision/getReviewerRequestsHandler';

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local database only');
  const snapshots = await collectReviewerReminders();
  let requests = 0;
  for (const snapshot of snapshots) {
    const ids = new Set<string>();
    for (const kind of ['supervision', 'mentorship']) {
      let page = 1;
      let pages = 1;
      do {
        let body: any;
        let status = 200;
        const reply: any = { code(value: number) { status = value; return this; }, send(value: any) { body = value; } };
        await getReviewerRequestsHandler({ user: { userId: snapshot.reviewerId },
          query: { kind, status: 'UNCONFIRMED', limit: '500', page: String(page) } } as any, reply);
        if (status === 403 && kind === 'mentorship') break;
        assert.equal(status, 200);
        body.items.forEach((item: any) => ids.add(item.id));
        pages = body.totalPages;
        page++;
      } while (page <= pages);
    }
    assert.deepEqual([...ids].sort(), snapshot.tasks.filter((task) => task.kind === 'hours').map((task) => task.id).sort());
    requests += ids.size;
  }
  console.log({ reviewers: snapshots.length, matchedRequestIds: requests, writes: 0, emailsSent: 0 });
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
