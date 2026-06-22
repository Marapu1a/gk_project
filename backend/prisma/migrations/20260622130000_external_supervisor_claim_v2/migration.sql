-- AlterEnum
ALTER TYPE "ExternalSupervisorClaimStatus" ADD VALUE 'SETUP_COMPLETE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "externalSupervisorClaimAssignedTo" TEXT;
