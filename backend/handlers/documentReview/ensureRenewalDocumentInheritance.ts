import {
  CycleType,
  DocumentReviewFileStatus,
  Prisma,
  RecordStatus,
} from '@prisma/client';
import { resolveDocumentReviewRequestStatus } from '../documentReviewAdmin/documentReviewFileStatusUtils';

type Tx = Prisma.TransactionClient;

/**
 * A certificate issued by this platform proves that document requirements were
 * already satisfied. Renewal keeps that decision and links the same files to
 * the new cycle without changing the archived request.
 */
export async function ensureRenewalDocumentInheritance(
  tx: Tx,
  userId: string,
  cycle: { id: string; type: CycleType },
) {
  if (cycle.type !== CycleType.RENEWAL) return null;

  const existing = await tx.documentReviewRequest.findFirst({
    where: { userId, cycleId: cycle.id },
    select: { id: true },
  });
  if (existing) return existing;

  const platformCertificate = await tx.certificate.findFirst({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
    select: { id: true },
  });
  if (!platformCertificate) return null;

  const previousRequests = await tx.documentReviewRequest.findMany({
    where: { userId, NOT: { cycleId: cycle.id } },
    orderBy: { submittedAt: 'desc' },
    include: {
      documents: { select: { id: true, type: true } },
      documentFiles: {
        select: {
          fileId: true,
          type: true,
          status: true,
          reviewedAt: true,
          reviewedById: true,
        },
      },
    },
  });

  const source = previousRequests.find(
    (request) => resolveDocumentReviewRequestStatus(request) === RecordStatus.CONFIRMED,
  );

  const inheritedFiles = new Map<
    string,
    { type: string | null; reviewedAt: Date | null; reviewedById: string | null }
  >();

  source?.documentFiles
    .filter((file) => file.status === DocumentReviewFileStatus.CONFIRMED)
    .forEach((file) => {
      inheritedFiles.set(file.fileId, {
        type: file.type,
        reviewedAt: file.reviewedAt,
        reviewedById: file.reviewedById,
      });
    });

  source?.documents.forEach((file) => {
    if (!inheritedFiles.has(file.id)) {
      inheritedFiles.set(file.id, {
        type: file.type,
        reviewedAt: source.reviewedAt,
        reviewedById: null,
      });
    }
  });

  const request = await tx.documentReviewRequest.create({
    data: {
      userId,
      cycleId: cycle.id,
      status: RecordStatus.CONFIRMED,
      reviewedAt: new Date(),
      comment: 'Документы подтверждены на основании ранее выданного сертификата ЦС ПАП',
    },
    select: { id: true },
  });

  if (inheritedFiles.size > 0) {
    await tx.documentReviewFile.createMany({
      data: Array.from(inheritedFiles.entries()).map(([fileId, file]) => ({
        requestId: request.id,
        fileId,
        type: file.type,
        status: DocumentReviewFileStatus.CONFIRMED,
        reviewedAt: file.reviewedAt ?? new Date(),
        reviewedById: file.reviewedById,
      })),
    });
  }

  return request;
}
