CREATE TYPE "DocumentReviewState" AS ENUM ('OPEN', 'COMPLETED');

ALTER TABLE "DocumentReviewRequest"
  ADD COLUMN "reviewState" "DocumentReviewState" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "reviewClosedAt" TIMESTAMP(3),
  ADD COLUMN "reviewClosedById" TEXT;

-- Уже подтверждённые заявки считаем завершёнными: иначе после обновления
-- пользователи с принятым комплектом документов внезапно потеряют готовность к экзамену.
UPDATE "DocumentReviewRequest"
SET
  "reviewState" = 'COMPLETED',
  "reviewClosedAt" = COALESCE("reviewedAt", "submittedAt")
WHERE "status" = 'CONFIRMED';
