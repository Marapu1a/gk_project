ALTER TABLE "SupervisionHour" ADD COLUMN "reviewedById" TEXT;

UPDATE "SupervisionHour"
SET "reviewedById" = "reviewerId"
WHERE "reviewedById" IS NULL
  AND "reviewerId" IS NOT NULL
  AND "status" IN ('CONFIRMED', 'REJECTED', 'SPENT');

CREATE INDEX "SupervisionHour_reviewedById_idx" ON "SupervisionHour"("reviewedById");

ALTER TABLE "SupervisionHour"
ADD CONSTRAINT "SupervisionHour_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
