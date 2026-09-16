import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';
import { buildReviewerReminder, ReminderSnapshot } from './reviewerReminder';
import { collectReviewerReminders } from './reviewerReminderSnapshot';
import { reminderSlot } from './reviewerReminderSchedule';

export const REMINDER_TEST_RECIPIENT = 'marapulets87@yandex.ru';

export async function deliverReviewerReminder(snapshot: ReminderSnapshot, slot: string, isTest: boolean) {
  const message = buildReviewerReminder(snapshot, isTest);
  if (!message) return 'EMPTY';
  const recipient = isTest ? REMINDER_TEST_RECIPIENT : snapshot.email;
  let log;
  try {
    log = await prisma.reviewerReminderLog.create({ data: {
      dedupeKey: isTest ? `test:${randomUUID()}` : `${slot}:${snapshot.reviewerId}`,
      reviewerId: snapshot.reviewerId, recipient, intendedRecipient: snapshot.email,
      fullName: snapshot.fullName, slot, isTest, tasks: message.tasks,
    } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'DUPLICATE';
    throw error;
  }
  try {
    await sendEmail({ to: recipient, subject: message.subject, html: message.html });
  } catch (error) {
    // No automatic resend: a timeout may occur after the SMTP server accepted the message.
    const cause = (error as { cause?: { code?: string; responseCode?: number } }).cause;
    await prisma.reviewerReminderLog.update({ where: { id: log.id }, data: {
      status: 'ERROR_OR_UNKNOWN', finishedAt: new Date(),
      error: `SMTP code=${cause?.code || 'unknown'} response=${cause?.responseCode || 'unknown'}`,
    } });
    return 'ERROR_OR_UNKNOWN';
  }
  // If this update fails, SENDING remains reserved; do not risk a duplicate email.
  await prisma.reviewerReminderLog.update({ where: { id: log.id }, data: {
    status: 'SMTP_ACCEPTED', finishedAt: new Date(),
  } });
  return 'SMTP_ACCEPTED';
}

export function startReviewerReminderScheduler(log: { error: (data: unknown, message?: string) => void }) {
  if (process.env.REVIEWER_REMINDERS_ENABLED !== '1') return;
  let running = false;
  const run = async () => {
    const slot = reminderSlot();
    if (!slot || running) return;
    running = true;
    try {
      const snapshots = await collectReviewerReminders();
      for (const snapshot of snapshots) {
        const existing = await prisma.reviewerReminderLog.findUnique({ where: { dedupeKey: `${slot}:${snapshot.reviewerId}` } });
        if (existing) continue;
        // Refresh immediately before claiming the send, including access and archive status.
        const [current] = await collectReviewerReminders(snapshot.reviewerId);
        if (current) await deliverReviewerReminder(current, slot, false);
      }
    } catch (error) { log.error(error, 'Reviewer reminder scheduler failed'); }
    finally { running = false; }
  };
  void run();
  const timer = setInterval(() => void run(), 15 * 60 * 1000);
  timer.unref();
  return timer;
}
