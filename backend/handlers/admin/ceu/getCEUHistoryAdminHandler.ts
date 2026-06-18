import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { CEUCategory, RecordStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';

type SortBy = 'createdAt' | 'eventDate' | 'email' | 'group' | 'category' | 'status' | 'points';
type SortDir = 'asc' | 'desc';

interface GetCEUHistoryAdminRoute extends RouteGenericInterface {
  Querystring: {
    createdFrom?: string;
    createdTo?: string;
    search?: string;
    group?: string;
    category?: CEUCategory | 'ALL';
    status?: RecordStatus | 'ALL';
    sortBy?: SortBy;
    sortDir?: SortDir;
    page?: string | number;
    perPage?: string | number;
  };
}

const CATEGORIES = new Set<string>(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']);
const STATUSES = new Set<string>(['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT']);
const SORT_FIELDS = new Set<string>([
  'createdAt',
  'eventDate',
  'email',
  'group',
  'category',
  'status',
  'points',
]);

const categoryLabels: Record<CEUCategory, string> = {
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
  GENERAL: 'Общие',
};

const statusLabels: Record<RecordStatus, string> = {
  UNCONFIRMED: 'Не подтверждено',
  CONFIRMED: 'Подтверждено',
  PARTIALLY_CONFIRMED: 'Частично подтверждено',
  REJECTED: 'Отклонено',
  SPENT: 'Использовано',
};

const activityTypeLabels: Record<string, string> = {
  TRAINING_ATTENDANCE: 'Участие в семинаре/тренинге',
  PRESENTATION: 'Проведение семинара/тренинга',
  PUBLICATION: 'Публикация материалов',
  TEACHING: 'Преподавание курсов',
};

const cycleTypeLabels: Record<string, string> = {
  CERTIFICATION: 'сертификация',
  RENEWAL: 'ресертификация',
};

const cycleStatusLabels: Record<string, string> = {
  ACTIVE: 'активный',
  COMPLETED: 'закрыт',
  ABANDONED: 'прерван',
};

const targetLevelLabels: Record<string, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

function toInt(value: unknown, fallback: number) {
  const parsed =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateStart(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEndExclusive(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + 1);
  return date;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().normalize('NFKC').trim();
}

function currentGroup(
  groups: { group: { id: string; name: string; rank: number } }[]
): { id: string; name: string; rank: number } | null {
  const sorted = [...groups].sort((a, b) => b.group.rank - a.group.rank);
  return sorted[0]?.group ?? null;
}

function buildCycleLabel(
  cycle?: { type: string; status: string; targetLevel: string } | null,
  fallbackGroupName?: string | null,
) {
  if (!cycle) {
    return fallbackGroupName ? `Старые CEU: ${fallbackGroupName}` : 'Старые CEU / без цикла';
  }

  const type = cycleTypeLabels[cycle.type] ?? cycle.type;
  const target = targetLevelLabels[cycle.targetLevel] ?? cycle.targetLevel;
  const status = cycleStatusLabels[cycle.status] ?? cycle.status;
  return `${type}: ${target} (${status})`;
}

function compareValues(a: string | number | Date | null, b: string | number | Date | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;

  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right, 'ru');
  }

  return left < right ? -1 : 1;
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCsv(rows: Awaited<ReturnType<typeof buildCEUHistoryRows>>['rows']) {
  const header = [
    'Дата добавления',
    'Дата мероприятия',
    'Email',
    'ФИО',
    'Цикл',
    'Категория',
    'Баллы',
    'Статус',
    'Тип CEU',
    'Файл',
  ];

  const lines = rows.map((row) =>
    [
      formatDateTime(row.recordCreatedAt),
      formatDate(row.eventDate),
      row.email,
      row.fullName ?? '',
      row.cycleLabel,
      categoryLabels[row.category] ?? row.category,
      row.points,
      statusLabels[row.status] ?? row.status,
      row.activityType ? activityTypeLabels[row.activityType] ?? row.activityType : '',
      row.file?.name ?? '',
    ]
      .map(csvCell)
      .join(';'),
  );

  return [header.map(csvCell).join(';'), ...lines].join('\n');
}

async function buildCEUHistoryRows(query: GetCEUHistoryAdminRoute['Querystring']) {
  const {
    createdFrom,
    createdTo,
    search = '',
    group = '',
    category = 'ALL',
    status = 'ALL',
    sortBy: rawSortBy = 'createdAt',
    sortDir: rawSortDir = 'desc',
  } = query;

  const from = parseDateStart(createdFrom);
  const to = parseDateEndExclusive(createdTo);

  if (from === null) return { error: 'INVALID_CREATED_FROM' as const, rows: [], page: 1, perPage: 100 };
  if (to === null) return { error: 'INVALID_CREATED_TO' as const, rows: [], page: 1, perPage: 100 };

  if (category !== 'ALL' && !CATEGORIES.has(category)) {
    return { error: 'INVALID_CATEGORY' as const, rows: [], page: 1, perPage: 100 };
  }

  if (status !== 'ALL' && !STATUSES.has(status)) {
    return { error: 'INVALID_STATUS' as const, rows: [], page: 1, perPage: 100 };
  }

  const sortBy: SortBy = SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'createdAt';
  const sortDir: SortDir = rawSortDir === 'asc' ? 'asc' : 'desc';
  const page = toInt(query.page, 1);
  const perPage = Math.min(toInt(query.perPage, 100), 500);

  const where: any = {
    ...(category !== 'ALL' ? { category } : {}),
    ...(status !== 'ALL' ? { status } : {}),
    record: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lt: to } : {}),
            },
          }
        : {}),
      ...(search.trim()
        ? {
            user: {
              OR: [
                { email: { contains: search.trim(), mode: 'insensitive' } },
                { fullName: { contains: search.trim(), mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
  };

  const entries = await prisma.cEUEntry.findMany({
    where,
    orderBy: [{ record: { createdAt: 'desc' } }, { id: 'desc' }],
    select: {
      id: true,
      category: true,
      value: true,
      status: true,
      reviewedAt: true,
      rejectedReason: true,
      reviewer: {
        select: { id: true, email: true, fullName: true },
      },
      record: {
        select: {
          id: true,
          userId: true,
          fileId: true,
          eventName: true,
          eventDate: true,
          activityType: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              groups: {
                select: {
                  group: { select: { id: true, name: true, rank: true } },
                },
              },
            },
          },
          cycle: {
            select: {
              id: true,
              type: true,
              status: true,
              targetLevel: true,
              startedAt: true,
            },
          },
        },
      },
    },
  });

  const fileIds = Array.from(
    new Set(entries.map((entry) => entry.record.fileId).filter(Boolean) as string[])
  );
  const files = fileIds.length
    ? await prisma.uploadedFile.findMany({
        where: { fileId: { in: fileIds } },
        select: { id: true, fileId: true, name: true, mimeType: true, createdAt: true },
      })
    : [];
  const fileByStorageId = new Map(files.map((file) => [file.fileId, file]));

  const rows = entries.map((entry) => {
    const group = currentGroup(entry.record.user.groups);
    const file = entry.record.fileId ? fileByStorageId.get(entry.record.fileId) ?? null : null;
    const cycleLabel = buildCycleLabel(entry.record.cycle, group?.name);

    return {
      entryId: entry.id,
      recordId: entry.record.id,
      userId: entry.record.user.id,
      email: entry.record.user.email,
      fullName: entry.record.user.fullName,
      role: entry.record.user.role,
      currentGroup: group,
      groups: entry.record.user.groups.map((item) => item.group),
      recordCreatedAt: entry.record.createdAt,
      eventDate: entry.record.eventDate,
      eventName: entry.record.eventName,
      activityType: entry.record.activityType,
      category: entry.category,
      points: entry.value,
      status: entry.status,
      reviewedAt: entry.reviewedAt,
      rejectedReason: entry.rejectedReason,
      reviewer: entry.reviewer,
      cycle: entry.record.cycle,
      cycleLabel,
      file,
    };
  }).filter((row) => {
    if (!group.trim()) return true;
    const needle = normalize(group);
    return normalize(row.cycleLabel).includes(needle);
  });

  rows.sort((a, b) => {
    const direction = sortDir === 'asc' ? 1 : -1;
    const values: Record<SortBy, [string | number | Date | null, string | number | Date | null]> = {
      createdAt: [a.recordCreatedAt, b.recordCreatedAt],
      eventDate: [a.eventDate, b.eventDate],
      email: [normalize(a.email), normalize(b.email)],
      group: [normalize(a.cycleLabel), normalize(b.cycleLabel)],
      category: [normalize(a.category), normalize(b.category)],
      status: [normalize(a.status), normalize(b.status)],
      points: [a.points, b.points],
    };

    const primary = compareValues(...values[sortBy]);
    if (primary !== 0) return primary * direction;

    return compareValues(b.recordCreatedAt, a.recordCreatedAt);
  });

  return {
    error: null,
    rows,
    page,
    perPage,
  };
}

export async function getCEUHistoryAdminHandler(
  req: FastifyRequest<GetCEUHistoryAdminRoute>,
  reply: FastifyReply
) {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const result = await buildCEUHistoryRows(req.query);
  if (result.error) return reply.code(400).send({ error: result.error });

  const { rows, page, perPage } = result;
  const total = rows.length;
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);

  return reply.send({
    total,
    page,
    perPage,
    rows: pageRows,
  });
}

export async function getCEUHistoryAdminExportHandler(
  req: FastifyRequest<GetCEUHistoryAdminRoute>,
  reply: FastifyReply,
) {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const result = await buildCEUHistoryRows(req.query);
  if (result.error) return reply.code(400).send({ error: result.error });

  const csv = buildCsv(result.rows);
  const filename = `ceu_history_${new Date().toISOString().slice(0, 10)}.csv`;

  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(`\uFEFF${csv}`);
}
