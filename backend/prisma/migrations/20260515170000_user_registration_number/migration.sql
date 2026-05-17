ALTER TABLE "User" ADD COLUMN "registrationNumber" TEXT;

WITH numbered AS (
  SELECT
    id,
    lpad(row_number() OVER (ORDER BY "createdAt" ASC, id ASC)::text, 6, '0') AS number
  FROM "User"
)
UPDATE "User" AS u
SET "registrationNumber" = numbered.number
FROM numbered
WHERE u.id = numbered.id;

CREATE UNIQUE INDEX "User_registrationNumber_key" ON "User"("registrationNumber");
