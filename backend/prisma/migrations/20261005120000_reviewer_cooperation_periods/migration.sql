ALTER TYPE "ReviewerCandidateStatus" ADD VALUE 'ENDED';

ALTER TABLE "ReviewerCandidateRelation"
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "endedById" TEXT,
  ADD COLUMN "endReason" TEXT;

DROP INDEX "ReviewerCandidateRelation_reviewerId_candidateId_cycleId_ki_key";

CREATE INDEX "ReviewerCandidateRelation_reviewerId_candidateId_cycleId_kind_idx"
  ON "ReviewerCandidateRelation"("reviewerId", "candidateId", "cycleId", "kind");

CREATE UNIQUE INDEX "ReviewerCandidateRelation_one_open_period_key"
  ON "ReviewerCandidateRelation"("reviewerId", "candidateId", "cycleId", "kind")
  WHERE status IN ('PENDING', 'ACCEPTED');
