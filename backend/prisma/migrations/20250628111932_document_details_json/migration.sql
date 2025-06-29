/*
  Warnings:

  - You are about to drop the column `fileIds` on the `DocumentReviewRequest` table. All the data in the column will be lost.
  - Added the required column `documentDetails` to the `DocumentReviewRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentReviewRequest" DROP COLUMN "fileIds",
ADD COLUMN     "documentDetails" JSONB NOT NULL;
