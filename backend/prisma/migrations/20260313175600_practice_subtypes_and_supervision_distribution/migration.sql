-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PracticeLevel" ADD VALUE 'IMPLEMENTING';
ALTER TYPE "PracticeLevel" ADD VALUE 'PROGRAMMING';

-- CreateTable
CREATE TABLE "SupervisionDistribution" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "directIndividual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directGroup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonObservingIndividual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonObservingGroup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisionDistribution_cycleId_key" ON "SupervisionDistribution"("cycleId");
