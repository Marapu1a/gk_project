import { FastifyReply, FastifyRequest } from 'fastify';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { collectReviewerReminders } from '../../utils/reviewerReminderSnapshot';
import type { ReminderTask } from '../../utils/reviewerReminder';

const statuses: Record<string, string> = {
  SMTP_ACCEPTED: 'Принято почтовым сервером', SENDING: 'Отправляется / результат неизвестен',
  ERROR_OR_UNKNOWN: 'Ошибка / результат неизвестен',
};

export async function reviewerRemindersHandler(req: FastifyRequest, reply: FastifyReply) {
  const q = req.query as Record<string, string | undefined>;
  const history = q.view === 'history';
  const search = (q.search || '').trim().slice(0, 200);
  const reviewerId = (q.reviewerId || '').trim().slice(0, 200);
  const page = Math.max(1, Math.min(100000, Number.parseInt(q.page || '1', 10) || 1));
  const exporting = q.export === 'xlsx';
  const limit = exporting ? 5000 : 25;
  const skip = exporting ? 0 : (page - 1) * limit;
  let total = 0;
  let rows: Array<Record<string, unknown>> = [];
  if (history) {
    const where = {
      ...(reviewerId ? { reviewerId } : {}),
      ...(q.tests === '1' ? {} : { isTest: false }),
      ...(search ? { OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { intendedRecipient: { contains: search, mode: 'insensitive' as const } },
      ] } : {}),
    };
    total = await prisma.reviewerReminderLog.count({ where });
    if (exporting && total > limit) return reply.code(400).send({ error: 'Более 5000 записей. Уточните поиск для выгрузки.' });
    const logs = await prisma.reviewerReminderLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: limit });
    const allTasks = logs.flatMap((log) => log.tasks as ReminderTask[]);
    const [relations, hours] = await Promise.all([
      prisma.reviewerCandidateRelation.findMany({ where: { id: { in: allTasks.filter((t) => t.kind === 'cooperation').map((t) => t.id) } },
        include: { candidate: { select: { fullName: true } } } }),
      prisma.supervisionHour.findMany({ where: { recordId: { in: allTasks.filter((t) => t.kind === 'hours').map((t) => t.id) } },
        include: { record: { select: { user: { select: { fullName: true } } } } } }),
    ]);
    rows = logs.map((log) => {
      const tasks = (log.tasks as ReminderTask[]).map((task) => {
        const relation = relations.find((r) => r.id === task.id && r.reviewerId === log.reviewerId);
        const assigned = hours.filter((h) => h.recordId === task.id && h.reviewerId === log.reviewerId);
        const available = task.kind === 'cooperation' ? Boolean(relation) : assigned.length > 0;
        const pending = task.kind === 'cooperation' ? relation?.status === 'PENDING' : assigned.some((h) => h.status === 'UNCONFIRMED');
        return { ...task, candidate: task.kind === 'cooperation' ? relation?.candidate.fullName : assigned[0]?.record.user.fullName,
          state: !available ? 'Недоступна / переназначена' : pending ? 'Ожидает решения' : 'Обработана' };
      });
      return { id: log.id, fullName: log.fullName, email: log.intendedRecipient, recipient: log.recipient,
        date: log.createdAt, status: statuses[log.status] || log.status, isTest: log.isTest, error: log.error,
        count: tasks.length, pending: tasks.filter((t) => t.state === 'Ожидает решения').length,
        processed: tasks.filter((t) => t.state === 'Обработана').length,
        unavailable: tasks.filter((t) => t.state === 'Недоступна / переназначена').length, tasks };
    });
  } else {
    const snapshots = (await collectReviewerReminders(reviewerId || undefined))
      .filter((s) => `${s.fullName} ${s.email}`.toLowerCase().includes(search.toLowerCase()));
    const oldest = (tasks: ReminderTask[]) => tasks.length ? Math.min(...tasks.map((t) => new Date(t.createdAt).getTime())) : Infinity;
    snapshots.sort((a, b) => oldest(a.tasks) - oldest(b.tasks) || a.reviewerId.localeCompare(b.reviewerId));
    total = snapshots.length;
    if (exporting && total > limit) return reply.code(400).send({ error: 'Более 5000 записей. Уточните поиск для выгрузки.' });
    const selected = snapshots.slice(skip, skip + limit);
    const last = await prisma.reviewerReminderLog.findMany({
      where: { reviewerId: { in: selected.map((s) => s.reviewerId) }, isTest: false, status: 'SMTP_ACCEPTED' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], distinct: ['reviewerId'],
      select: { reviewerId: true, createdAt: true },
    });
    rows = selected.map((s) => ({ id: s.reviewerId, fullName: s.fullName, email: s.email,
      cooperation: s.tasks.filter((t) => t.kind === 'cooperation').length,
      hours: s.tasks.filter((t) => t.kind === 'hours').length,
      oldest: s.tasks.length ? new Date(oldest(s.tasks)).toISOString() : null,
      days: s.tasks.length ? Math.max(0, Math.floor((Date.now() - oldest(s.tasks)) / 86400000)) : 0,
      lastSent: last.find((l) => l.reviewerId === s.reviewerId)?.createdAt ?? null }));
  }
  if (exporting) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(history ? 'История' : 'Ожидают решения');
    const columns = history
      ? [['fullName', 'ФИО'], ['email', 'Email'], ['date', 'Дата'], ['status', 'Результат'], ['isTest', 'Тест'], ['count', 'Задач'], ['processed', 'Обработано'], ['pending', 'Ожидает'], ['unavailable', 'Недоступно']]
      : [['fullName', 'ФИО'], ['email', 'Email'], ['cooperation', 'Сотрудничества'], ['hours', 'Заявки часов'], ['oldest', 'Ожидает решения с'], ['days', 'Дней ожидания'], ['lastSent', 'Последнее напоминание']];
    sheet.columns = columns.map(([key, header]) => ({ key, header, width: 28 }));
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="reviewer-reminders.xlsx"').send(Buffer.from(buffer));
  }
  return { rows, total, page, pageSize: limit };
}
