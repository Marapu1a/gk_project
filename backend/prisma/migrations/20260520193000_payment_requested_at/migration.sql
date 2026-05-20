ALTER TABLE "Payment"
  ADD COLUMN "requestedAt" TIMESTAMP(3);

UPDATE "Payment"
SET "requestedAt" = "updatedAt"
WHERE "status" IN ('PENDING', 'PAID')
  AND "requestedAt" IS NULL;
