-- CreateEnum
CREATE TYPE "ReviewerCandidateKind" AS ENUM ('SUPERVISION', 'MENTORSHIP');

-- CreateEnum
CREATE TYPE "ReviewerCandidateStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ReviewerCandidateRelation" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "kind" "ReviewerCandidateKind" NOT NULL,
    "status" "ReviewerCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerCandidateRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewerCandidateRelation_reviewerId_kind_status_idx" ON "ReviewerCandidateRelation"("reviewerId", "kind", "status");

-- CreateIndex
CREATE INDEX "ReviewerCandidateRelation_candidateId_cycleId_idx" ON "ReviewerCandidateRelation"("candidateId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerCandidateRelation_reviewerId_candidateId_cycleId_ki_key" ON "ReviewerCandidateRelation"("reviewerId", "candidateId", "cycleId", "kind");

-- AddForeignKey
ALTER TABLE "ReviewerCandidateRelation" ADD CONSTRAINT "ReviewerCandidateRelation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerCandidateRelation" ADD CONSTRAINT "ReviewerCandidateRelation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerCandidateRelation" ADD CONSTRAINT "ReviewerCandidateRelation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
