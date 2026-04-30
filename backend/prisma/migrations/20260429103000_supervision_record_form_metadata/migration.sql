-- AlterTable
ALTER TABLE "SupervisionRecord"
ADD COLUMN "periodStartedAt" TIMESTAMP(3),
ADD COLUMN "periodEndedAt" TIMESTAMP(3),
ADD COLUMN "treatmentSetting" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "ethicsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "draftDirectIndividual" DOUBLE PRECISION,
ADD COLUMN "draftDirectGroup" DOUBLE PRECISION,
ADD COLUMN "draftNonObservingIndividual" DOUBLE PRECISION,
ADD COLUMN "draftNonObservingGroup" DOUBLE PRECISION;
