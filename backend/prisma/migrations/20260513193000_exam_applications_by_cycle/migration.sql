-- Exam applications used to be global per user. From now on they belong to
-- the active certification cycle, so old approved/rejected applications do not
-- block a new cycle.
ALTER TABLE "ExamApplication" ADD COLUMN "cycleId" TEXT;

UPDATE "ExamApplication" AS ea
SET "cycleId" = cc."id"
FROM "CertificationCycle" AS cc
WHERE cc."userId" = ea."userId"
  AND cc."status" = 'ACTIVE'
  AND ea."cycleId" IS NULL;

DROP INDEX IF EXISTS "ExamApplication_userId_key";

CREATE UNIQUE INDEX "ExamApplication_userId_cycleId_key"
  ON "ExamApplication"("userId", "cycleId");

CREATE INDEX "ExamApplication_userId_idx" ON "ExamApplication"("userId");
CREATE INDEX "ExamApplication_cycleId_idx" ON "ExamApplication"("cycleId");

ALTER TABLE "ExamApplication"
  ADD CONSTRAINT "ExamApplication_cycleId_fkey"
  FOREIGN KEY ("cycleId") REFERENCES "CertificationCycle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
