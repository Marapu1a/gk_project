-- CreateEnum
CREATE TYPE "DocumentReviewFileStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'DELETED');

-- AlterEnum
ALTER TYPE "RecordStatus" ADD VALUE 'PARTIALLY_CONFIRMED';

-- AlterTable
ALTER TABLE "DocumentReviewRequest" ADD COLUMN     "cycleId" TEXT;

-- CreateTable
CREATE TABLE "DocumentReviewFile" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "type" TEXT,
    "status" "DocumentReviewFileStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "adminComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReviewFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentReviewFile_requestId_idx" ON "DocumentReviewFile"("requestId");

-- CreateIndex
CREATE INDEX "DocumentReviewFile_fileId_idx" ON "DocumentReviewFile"("fileId");

-- CreateIndex
CREATE INDEX "DocumentReviewFile_status_idx" ON "DocumentReviewFile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReviewFile_requestId_fileId_key" ON "DocumentReviewFile"("requestId", "fileId");

-- CreateIndex
CREATE INDEX "DocumentReviewRequest_cycleId_idx" ON "DocumentReviewRequest"("cycleId");

-- AddForeignKey
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewFile" ADD CONSTRAINT "DocumentReviewFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewFile" ADD CONSTRAINT "DocumentReviewFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewFile" ADD CONSTRAINT "DocumentReviewFile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewFile" ADD CONSTRAINT "DocumentReviewFile_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
