-- CreateTable
CREATE TABLE "DocumentReviewRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileIds" TEXT[],
    "status" "RecordStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "reviewerEmail" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "DocumentReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReviewRequest_userId_status_key" ON "DocumentReviewRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
