ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER';

ALTER TABLE "User"
  ADD COLUMN "ibaoId" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT,
  ADD COLUMN "archiveRequestedAt" TIMESTAMP(3),
  ADD COLUMN "archiveRequestReason" TEXT;

CREATE INDEX "User_archivedAt_idx" ON "User"("archivedAt");
CREATE INDEX "User_archiveRequestedAt_idx" ON "User"("archiveRequestedAt");
