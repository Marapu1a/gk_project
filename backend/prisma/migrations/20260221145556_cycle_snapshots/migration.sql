-- AlterTable
ALTER TABLE "CertificationCycle" ADD COLUMN     "modifiersSnapshot" JSONB,
ADD COLUMN     "requirementsSnapshot" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "CertificationCycle_userId_only_one_active"
ON "CertificationCycle" ("userId")
WHERE "status" = 'ACTIVE';
