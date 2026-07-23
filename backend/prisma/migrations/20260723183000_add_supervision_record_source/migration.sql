CREATE TYPE "SupervisionRecordSource" AS ENUM ('CURRENT', 'LEGACY_VERSION');

ALTER TABLE "SupervisionRecord"
ADD COLUMN "source" "SupervisionRecordSource" NOT NULL DEFAULT 'CURRENT';
