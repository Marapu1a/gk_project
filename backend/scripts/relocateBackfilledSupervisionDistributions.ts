import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CycleStatus, PracticeLevel, Prisma, RecordStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  supervisionDistributionTotal,
  type SupervisionDistributionValues,
} from '../domain/supervision/undistributedSupervisionBackfill';

const PRACTICE_TYPES: PracticeLevel[] = [
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

type SourceEntry = {
  email: string;
  cycleId: string;
  storageTarget: {
    kind: 'LEGACY_DISTRIBUTION' | 'CONFIRMED_RECORD';
    id: string | null;
    after: SupervisionDistributionValues;
  };
};

type SourceReport = { entries: SourceEntry[] };

type RelocationItem = {
  email: string;
  cycleId: string;
  sourceDistributionId: string;
  targetRecordId: string;
  distribution: SupervisionDistributionValues;
};

type RelocationScan = {
  plan: RelocationItem[];
  skipped: Array<{ email: string; cycleId: string; reason: string }>;
};

function argValue(name: string) {
  return process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

function distribution(value: {
  directIndividual?: number | null;
  directGroup?: number | null;
  nonObservingIndividual?: number | null;
  nonObservingGroup?: number | null;
  draftDirectIndividual?: number | null;
  draftDirectGroup?: number | null;
  draftNonObservingIndividual?: number | null;
  draftNonObservingGroup?: number | null;
}): SupervisionDistributionValues {
  return {
    directIndividual: value.directIndividual ?? value.draftDirectIndividual ?? 0,
    directGroup: value.directGroup ?? value.draftDirectGroup ?? 0,
    nonObservingIndividual:
      value.nonObservingIndividual ?? value.draftNonObservingIndividual ?? 0,
    nonObservingGroup: value.nonObservingGroup ?? value.draftNonObservingGroup ?? 0,
  };
}

function sameDistribution(
  left: SupervisionDistributionValues,
  right: SupervisionDistributionValues,
) {
  return (
    Math.abs(left.directIndividual - right.directIndividual) < 0.001 &&
    Math.abs(left.directGroup - right.directGroup) < 0.001 &&
    Math.abs(left.nonObservingIndividual - right.nonObservingIndividual) < 0.001 &&
    Math.abs(left.nonObservingGroup - right.nonObservingGroup) < 0.001
  );
}

function recordUpdate(value: SupervisionDistributionValues) {
  return {
    draftDirectIndividual: value.directIndividual,
    draftDirectGroup: value.directGroup,
    draftNonObservingIndividual: value.nonObservingIndividual,
    draftNonObservingGroup: value.nonObservingGroup,
  };
}

async function buildPlan(source: SourceReport): Promise<RelocationScan> {
  const entries = source.entries.filter(
    (entry) => entry.storageTarget.kind === 'LEGACY_DISTRIBUTION',
  );
  const plan: RelocationItem[] = [];
  const skipped: RelocationScan['skipped'] = [];

  for (const entry of entries) {
    if (!entry.storageTarget.id) {
      throw new Error(`${entry.email}: в apply-отчёте отсутствует ID распределения`);
    }
    const current = await prisma.supervisionDistribution.findUnique({
      where: { id: entry.storageTarget.id },
    });
    if (
      !current ||
      current.cycleId !== entry.cycleId ||
      !sameDistribution(distribution(current), entry.storageTarget.after)
    ) {
      throw new Error(`${entry.email}: исходное распределение изменилось`);
    }

    const records = await prisma.supervisionRecord.findMany({
      where: {
        cycleId: entry.cycleId,
        hours: {
          some: { status: RecordStatus.CONFIRMED, type: { in: PRACTICE_TYPES } },
          every: { status: RecordStatus.CONFIRMED },
        },
      },
      select: {
        id: true,
        createdAt: true,
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const target = records.find(
      (record) => supervisionDistributionTotal(distribution(record)) === 0,
    );
    if (!target) {
      skipped.push({
        email: entry.email,
        cycleId: entry.cycleId,
        reason: 'нет пустой подтверждённой заявки для переноса',
      });
      continue;
    }
    plan.push({
      email: entry.email,
      cycleId: entry.cycleId,
      sourceDistributionId: current.id,
      targetRecordId: target.id,
      distribution: entry.storageTarget.after,
    });
  }
  return { plan, skipped };
}

async function applyPlan(plan: RelocationItem[]) {
  await prisma.$transaction(
    async (tx) => {
      for (const item of plan) {
        const cycle = await tx.certificationCycle.findUnique({
          where: { id: item.cycleId },
          select: { status: true },
        });
        const source = await tx.supervisionDistribution.findUnique({
          where: { id: item.sourceDistributionId },
        });
        const target = await tx.supervisionRecord.findUnique({
          where: { id: item.targetRecordId },
          select: {
            cycleId: true,
            draftDirectIndividual: true,
            draftDirectGroup: true,
            draftNonObservingIndividual: true,
            draftNonObservingGroup: true,
            hours: { select: { status: true, type: true } },
          },
        });
        const confirmedPractice = target?.hours.some(
          (hour) =>
            hour.status === RecordStatus.CONFIRMED && PRACTICE_TYPES.includes(hour.type),
        );
        const allConfirmed = target?.hours.every(
          (hour) => hour.status === RecordStatus.CONFIRMED,
        );
        if (
          cycle?.status !== CycleStatus.ACTIVE ||
          !source ||
          source.cycleId !== item.cycleId ||
          !sameDistribution(distribution(source), item.distribution) ||
          !target ||
          target.cycleId !== item.cycleId ||
          !confirmedPractice ||
          !allConfirmed ||
          supervisionDistributionTotal(distribution(target)) !== 0
        ) {
          throw new Error(`${item.email}: данные изменились после dry-run переноса`);
        }
        await tx.supervisionRecord.update({
          where: { id: item.targetRecordId },
          data: recordUpdate(item.distribution),
        });
        await tx.supervisionDistribution.delete({
          where: { id: item.sourceDistributionId },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 },
  );
}

function writeReport(path: string | undefined, report: unknown) {
  if (!path) return;
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  const sourcePath = argValue('--source-report');
  if (!sourcePath) throw new Error('Передайте --source-report=<apply-report.json>');
  const source = JSON.parse(readFileSync(resolve(sourcePath), 'utf8')) as SourceReport;
  const scan = await buildPlan(source);
  const { plan, skipped } = scan;
  const planFingerprint = createHash('sha256')
    .update(JSON.stringify({ plan, skipped }))
    .digest('hex');
  const shouldApply = process.argv.includes('--apply');
  console.table(
    plan.map((item) => ({
      email: item.email,
      hours: supervisionDistributionTotal(item.distribution),
      source: item.sourceDistributionId,
      target: item.targetRecordId,
    })),
  );
  console.log(`${shouldApply ? 'Apply' : 'Dry-run'}: переносов ${plan.length}`);
  if (skipped.length > 0) console.warn(`Оставлено в legacy-слое: ${skipped.length}`);
  console.log(`Fingerprint: ${planFingerprint}`);

  if (shouldApply) {
    if (argValue('--expected-fingerprint') !== planFingerprint) {
      throw new Error('Apply отменён: fingerprint не совпадает');
    }
    await applyPlan(plan);
  }
  writeReport(argValue('--report'), {
    generatedAt: new Date().toISOString(),
    mode: shouldApply ? 'apply' : 'dry-run',
    fingerprint: planFingerprint,
    relocated: shouldApply ? plan.length : 0,
    candidates: plan.length,
    skipped,
    entries: plan,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
