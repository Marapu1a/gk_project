ALTER TABLE "DocumentReviewFile"
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "deletionRequestComment" TEXT;
