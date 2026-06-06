import { DocumentReviewFileStatus, Prisma, RecordStatus } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type RequestWithDocumentFiles = {
  status: RecordStatus;
  documentFiles?: Array<{ status: DocumentReviewFileStatus }> | null;
};

export function resolveRequestStatus(
  files: Array<{ status: DocumentReviewFileStatus }>
): RecordStatus {
  const reviewableFiles = files.filter((file) => file.status !== DocumentReviewFileStatus.DELETED);

  if (!reviewableFiles.length) return RecordStatus.REJECTED;

  const confirmed = reviewableFiles.filter((file) => file.status === DocumentReviewFileStatus.CONFIRMED).length;
  const pending = reviewableFiles.filter((file) => file.status === DocumentReviewFileStatus.UNCONFIRMED).length;

  if (pending > 0) {
    return confirmed > 0 ? RecordStatus.PARTIALLY_CONFIRMED : RecordStatus.UNCONFIRMED;
  }

  if (confirmed === reviewableFiles.length) return RecordStatus.CONFIRMED;
  if (confirmed > 0) return RecordStatus.PARTIALLY_CONFIRMED;

  return RecordStatus.REJECTED;
}

export function resolveDocumentReviewRequestStatus<T extends RequestWithDocumentFiles>(
  request: T,
): RecordStatus {
  if (!request.documentFiles?.length) {
    return request.status;
  }

  return resolveRequestStatus(request.documentFiles);
}

export function withResolvedDocumentReviewRequestStatus<T extends RequestWithDocumentFiles>(
  request: T,
): T {
  return {
    ...request,
    status: resolveDocumentReviewRequestStatus(request),
  };
}

export async function recalculateDocumentReviewRequestStatus(tx: Tx, requestId: string) {
  const files = await tx.documentReviewFile.findMany({
    where: { requestId },
    select: { status: true },
  });

  const status = resolveRequestStatus(files);

  return tx.documentReviewRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewedAt:
        status === RecordStatus.UNCONFIRMED || status === RecordStatus.PARTIALLY_CONFIRMED
          ? null
          : new Date(),
    },
  });
}
