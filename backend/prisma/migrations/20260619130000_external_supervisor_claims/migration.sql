CREATE TYPE "ExternalSupervisorClaimStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User"
ADD COLUMN "externalSupervisorClaimStatus" "ExternalSupervisorClaimStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "externalSupervisorClaimedAt" TIMESTAMP(3),
ADD COLUMN "externalSupervisorClaimReviewedAt" TIMESTAMP(3),
ADD COLUMN "externalSupervisorClaimReviewedBy" TEXT;

CREATE INDEX "User_externalSupervisorClaimStatus_externalSupervisorClaimedAt_idx"
ON "User"("externalSupervisorClaimStatus", "externalSupervisorClaimedAt");
