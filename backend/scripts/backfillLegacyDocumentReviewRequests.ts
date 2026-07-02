import {
  DocumentReviewFileStatus,
  PrismaClient,
  RecordStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

type Candidate = {
  userId: string;
  email: string;
  fullName: string | null;
  cycleId: string;
  cycleStartedAt: Date;
  requestId: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  resolvedStatus: RecordStatus;
  reviewableFiles: number;
  confirmedFiles: number;
  pendingFiles: number;
  rejectedFiles: number;
};

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function limitFromArgs() {
  const raw = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveStatus(files: Array<{ status: DocumentReviewFileStatus }>): RecordStatus {
  const reviewable = files.filter((file) => file.status !== DocumentReviewFileStatus.DELETED);
  if (!reviewable.length) return RecordStatus.REJECTED;

  const confirmed = reviewable.filter((file) => file.status === DocumentReviewFileStatus.CONFIRMED).length;
  const pending = reviewable.filter((file) => file.status === DocumentReviewFileStatus.UNCONFIRMED).length;

  if (pending > 0) return confirmed > 0 ? RecordStatus.PARTIALLY_CONFIRMED : RecordStatus.UNCONFIRMED;
  if (confirmed === reviewable.length) return RecordStatus.CONFIRMED;
  if (confirmed > 0) return RecordStatus.PARTIALLY_CONFIRMED;

  return RecordStatus.REJECTED;
}

function fileStats(files: Array<{ status: DocumentReviewFileStatus }>) {
  const reviewable = files.filter((file) => file.status !== DocumentReviewFileStatus.DELETED);
  return {
    reviewableFiles: reviewable.length,
    confirmedFiles: reviewable.filter((file) => file.status === DocumentReviewFileStatus.CONFIRMED).length,
    pendingFiles: reviewable.filter((file) => file.status === DocumentReviewFileStatus.UNCONFIRMED).length,
    rejectedFiles: reviewable.filter((file) => file.status === DocumentReviewFileStatus.REJECTED).length,
  };
}

function formatCandidate(candidate: Candidate) {
  return [
    candidate.email,
    candidate.fullName ?? '-',
    `cycle=${candidate.cycleId}`,
    `request=${candidate.requestId}`,
    `status=${candidate.resolvedStatus}`,
    `files=${candidate.reviewableFiles}`,
    `confirmed=${candidate.confirmedFiles}`,
    `pending=${candidate.pendingFiles}`,
    `rejected=${candidate.rejectedFiles}`,
    `submitted=${candidate.submittedAt.toISOString().slice(0, 10)}`,
  ].join(' | ');
}

async function main() {
  const apply = hasFlag('--apply');
  const limit = limitFromArgs();

  const activeCycles = await prisma.certificationCycle.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ userId: 'asc' }, { startedAt: 'desc' }],
    select: {
      id: true,
      userId: true,
      startedAt: true,
      user: {
        select: {
          email: true,
          fullName: true,
          documentReviewRequests: {
            include: { documentFiles: { select: { status: true } } },
            orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
          },
        },
      },
    },
  });

  const latestCycleByUser = new Map<string, (typeof activeCycles)[number]>();
  for (const cycle of activeCycles) {
    if (!latestCycleByUser.has(cycle.userId)) {
      latestCycleByUser.set(cycle.userId, cycle);
    }
  }

  const candidates: Candidate[] = [];
  const skipped = {
    alreadyHasActiveRequest: 0,
    noLegacyRequest: 0,
    noReviewableFiles: 0,
  };

  for (const cycle of latestCycleByUser.values()) {
    const requests = cycle.user.documentReviewRequests;
    const hasActiveRequest = requests.some((request) => request.cycleId === cycle.id);
    if (hasActiveRequest) {
      skipped.alreadyHasActiveRequest += 1;
      continue;
    }

    const legacyRequests = requests.filter((request) => !request.cycleId);
    if (!legacyRequests.length) {
      skipped.noLegacyRequest += 1;
      continue;
    }

    const legacyRequest = legacyRequests.find((request) =>
      request.documentFiles.some((file) => file.status !== DocumentReviewFileStatus.DELETED),
    );
    if (!legacyRequest) {
      skipped.noReviewableFiles += 1;
      continue;
    }

    const stats = fileStats(legacyRequest.documentFiles);
    candidates.push({
      userId: cycle.userId,
      email: cycle.user.email,
      fullName: cycle.user.fullName,
      cycleId: cycle.id,
      cycleStartedAt: cycle.startedAt,
      requestId: legacyRequest.id,
      submittedAt: legacyRequest.submittedAt,
      reviewedAt: legacyRequest.reviewedAt,
      resolvedStatus: resolveStatus(legacyRequest.documentFiles),
      ...stats,
    });
  }

  const selected = limit ? candidates.slice(0, limit) : candidates;

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Active users checked: ${latestCycleByUser.size}`);
  console.log(`Candidates to promote: ${candidates.length}`);
  console.log(`Selected by limit: ${selected.length}`);
  console.log(`Skipped: ${JSON.stringify(skipped)}`);
  console.log('');

  for (const candidate of selected) {
    console.log(`${apply ? '[PROMOTE]' : '[WOULD_PROMOTE]'} ${formatCandidate(candidate)}`);

    if (!apply) continue;

    await prisma.documentReviewRequest.update({
      where: { id: candidate.requestId },
      data: {
        cycleId: candidate.cycleId,
        status: candidate.resolvedStatus,
        reviewedAt:
          candidate.resolvedStatus === RecordStatus.UNCONFIRMED ||
          candidate.resolvedStatus === RecordStatus.PARTIALLY_CONFIRMED
            ? null
            : candidate.reviewedAt ?? candidate.submittedAt,
      },
    });
  }

  console.log('');
  console.log(apply ? 'Done.' : 'Dry-run only. Re-run with --apply to write changes.');
}

main()
  .catch((error) => {
    console.error('Legacy document review backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
