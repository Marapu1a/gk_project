ALTER TABLE "UploadedFile"
ADD COLUMN "contentHash" TEXT;

CREATE INDEX "UploadedFile_userId_contentHash_idx"
ON "UploadedFile"("userId", "contentHash");
