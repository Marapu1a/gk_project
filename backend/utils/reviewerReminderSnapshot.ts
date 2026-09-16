import { PracticeLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { ReminderSnapshot } from './reviewerReminder';

// Mirror reviewer access and request-list filtering. Do not count individual hour rows.
export async function collectReviewerReminders(reviewerId?: string, includeEmpty = false): Promise<ReminderSnapshot[]> {
  const users = await prisma.user.findMany({
    where: { archivedAt: null, ...(reviewerId ? { id: reviewerId } : {}),
      groups: { some: { group: { name: { in: ['Супервизор', 'Опытный Супервизор'] } } } } },
    select: { id: true, fullName: true, email: true,
      groups: { select: { group: { select: { name: true } } } } },
  });
  const result: ReminderSnapshot[] = [];
  for (const user of users) {
    const experienced = user.groups.some((g) => g.group.name === 'Опытный Супервизор');
    const types: PracticeLevel[] = ['INSTRUCTOR', 'CURATOR', 'PRACTICE', 'IMPLEMENTING', 'PROGRAMMING'];
    if (experienced) types.push('SUPERVISOR', 'SUPERVISION');
    const [relations, records] = await Promise.all([
      prisma.reviewerCandidateRelation.findMany({
        where: { reviewerId: user.id, status: 'PENDING', cycle: { status: 'ACTIVE' },
          candidate: { archivedAt: null }, ...(!experienced ? { kind: 'SUPERVISION' as const } : {}) },
        select: { id: true, createdAt: true },
      }),
      prisma.supervisionRecord.findMany({
        where: { user: { archivedAt: null },
          hours: { some: { reviewerId: user.id, type: { in: types }, status: 'UNCONFIRMED' } } },
        select: { id: true, createdAt: true },
      }),
    ]);
    const tasks = [
      ...relations.map((r) => ({ id: r.id, kind: 'cooperation' as const, createdAt: r.createdAt.toISOString() })),
      ...records.map((r) => ({ id: r.id, kind: 'hours' as const, createdAt: r.createdAt.toISOString() })),
    ];
    if (tasks.length || includeEmpty) result.push({ reviewerId: user.id, fullName: user.fullName || '', email: user.email, tasks });
  }
  return result;
}
