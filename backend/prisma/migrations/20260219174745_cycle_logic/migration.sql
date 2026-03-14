/*
  Warnings:

  - A unique constraint covering the columns `[cycleId]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('CERTIFICATION', 'RENEWAL');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- AlterTable
ALTER TABLE "CEURecord" ADD COLUMN     "cycleId" TEXT;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "cycleId" TEXT;

-- AlterTable
ALTER TABLE "SupervisionRecord" ADD COLUMN     "cycleId" TEXT;

-- CreateTable
CREATE TABLE "CertificationCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetLevel" "TargetLevel" NOT NULL,
    "type" "CycleType" NOT NULL DEFAULT 'CERTIFICATION',
    "status" "CycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "abandonedReason" TEXT,

    CONSTRAINT "CertificationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificationCycle_userId_idx" ON "CertificationCycle"("userId");

-- CreateIndex
CREATE INDEX "CertificationCycle_userId_status_idx" ON "CertificationCycle"("userId", "status");

-- CreateIndex
CREATE INDEX "CEURecord_userId_idx" ON "CEURecord"("userId");

-- CreateIndex
CREATE INDEX "CEURecord_cycleId_idx" ON "CEURecord"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_cycleId_key" ON "Certificate"("cycleId");

-- CreateIndex
CREATE INDEX "SupervisionRecord_userId_idx" ON "SupervisionRecord"("userId");

-- CreateIndex
CREATE INDEX "SupervisionRecord_cycleId_idx" ON "SupervisionRecord"("cycleId");

-- AddForeignKey
ALTER TABLE "CertificationCycle" ADD CONSTRAINT "CertificationCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEURecord" ADD CONSTRAINT "CEURecord_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionRecord" ADD CONSTRAINT "SupervisionRecord_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
