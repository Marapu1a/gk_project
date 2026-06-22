ALTER TABLE "CEUEntry" ADD COLUMN "activityType" "CEUActivityType";

UPDATE "CEUEntry" AS entry
SET "activityType" = record."activityType"
FROM "CEURecord" AS record
WHERE entry."recordId" = record."id";
