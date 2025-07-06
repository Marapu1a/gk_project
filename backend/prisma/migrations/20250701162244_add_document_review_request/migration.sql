/*
  Warnings:

  - You are about to drop the column `documentDetails` on the `DocumentReviewRequest` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DocumentReviewRequest_userId_status_key";

-- AlterTable
ALTER TABLE "DocumentReviewRequest" DROP COLUMN "documentDetails";

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "type" TEXT;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentReviewRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
