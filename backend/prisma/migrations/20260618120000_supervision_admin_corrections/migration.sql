-- CreateEnum
CREATE TYPE "SupervisionAdminCorrectionKind" AS ENUM ('PRACTICE', 'MENTORSHIP');

-- CreateTable
CREATE TABLE "SupervisionAdminCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "adminId" TEXT,
    "kind" "SupervisionAdminCorrectionKind" NOT NULL,
    "implementing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "programming" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mentor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directIndividual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directGroup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonObservingIndividual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonObservingGroup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notifyUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionAdminCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisionAdminCorrection_cycleId_kind_key" ON "SupervisionAdminCorrection"("cycleId", "kind");

-- CreateIndex
CREATE INDEX "SupervisionAdminCorrection_userId_kind_updatedAt_idx" ON "SupervisionAdminCorrection"("userId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "SupervisionAdminCorrection_adminId_idx" ON "SupervisionAdminCorrection"("adminId");

-- AddForeignKey
ALTER TABLE "SupervisionAdminCorrection" ADD CONSTRAINT "SupervisionAdminCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionAdminCorrection" ADD CONSTRAINT "SupervisionAdminCorrection_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionAdminCorrection" ADD CONSTRAINT "SupervisionAdminCorrection_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
