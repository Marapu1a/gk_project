/*
  Warnings:

  - You are about to drop the column `hours` on the `SupervisionRequest` table. All the data in the column will be lost.
  - You are about to drop the column `practiceLevel` on the `SupervisionRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SupervisionRequest" DROP COLUMN "hours",
DROP COLUMN "practiceLevel",
ADD COLUMN     "hoursCurator" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "hoursInstructor" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "hoursSupervisor" DOUBLE PRECISION NOT NULL DEFAULT 0;
