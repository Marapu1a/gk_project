-- CreateTable
CREATE TABLE "SupervisionContract" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "supervisorInput" TEXT NOT NULL,
    "supervisorEmail" TEXT,
    "supervisorName" TEXT,
    "fileId" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisionContract_fileId_key" ON "SupervisionContract"("fileId");

-- CreateIndex
CREATE INDEX "SupervisionContract_userId_idx" ON "SupervisionContract"("userId");

-- CreateIndex
CREATE INDEX "SupervisionContract_supervisorId_idx" ON "SupervisionContract"("supervisorId");

-- CreateIndex
CREATE INDEX "SupervisionContract_status_idx" ON "SupervisionContract"("status");

-- AddForeignKey
ALTER TABLE "SupervisionContract" ADD CONSTRAINT "SupervisionContract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionContract" ADD CONSTRAINT "SupervisionContract_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionContract" ADD CONSTRAINT "SupervisionContract_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
