CREATE TABLE "ReviewerReminderLog" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "intendedRecipient" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "tasks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    CONSTRAINT "ReviewerReminderLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewerReminderLog_dedupeKey_key" ON "ReviewerReminderLog"("dedupeKey");
CREATE INDEX "ReviewerReminderLog_reviewerId_createdAt_idx" ON "ReviewerReminderLog"("reviewerId", "createdAt");
CREATE INDEX "ReviewerReminderLog_slot_isTest_idx" ON "ReviewerReminderLog"("slot", "isTest");
