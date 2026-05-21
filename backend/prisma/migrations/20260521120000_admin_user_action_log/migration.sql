-- CreateTable
CREATE TABLE "AdminUserActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminUserActionLog_userId_createdAt_idx" ON "AdminUserActionLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminUserActionLog_adminId_idx" ON "AdminUserActionLog"("adminId");

-- AddForeignKey
ALTER TABLE "AdminUserActionLog" ADD CONSTRAINT "AdminUserActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserActionLog" ADD CONSTRAINT "AdminUserActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
