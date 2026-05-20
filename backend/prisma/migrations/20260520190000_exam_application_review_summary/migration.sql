ALTER TABLE "ExamApplication"
  ADD COLUMN "comment" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByEmail" TEXT;
