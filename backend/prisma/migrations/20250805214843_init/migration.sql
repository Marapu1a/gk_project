-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT');

-- CreateEnum
CREATE TYPE "CEUCategory" AS ENUM ('ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL');

-- CreateEnum
CREATE TYPE "PracticeLevel" AS ENUM ('INSTRUCTOR', 'CURATOR', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DOCUMENT_REVIEW', 'EXAM_ACCESS', 'REGISTRATION', 'FULL_PACKAGE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CEU', 'SUPERVISION', 'MENTORSHIP', 'DOCUMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "country" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "previousId" TEXT,
    "confirmedById" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CEURecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CEURecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CEUEntry" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "category" "CEUCategory" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "CEUEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionHour" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "type" "PracticeLevel" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "SupervisionHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReviewRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "reviewerEmail" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "DocumentReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "type" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_fileId_key" ON "Certificate"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_previousId_key" ON "Certificate"("previousId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_fileId_key" ON "UploadedFile"("fileId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEURecord" ADD CONSTRAINT "CEURecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEUEntry" ADD CONSTRAINT "CEUEntry_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CEURecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CEUEntry" ADD CONSTRAINT "CEUEntry_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionRecord" ADD CONSTRAINT "SupervisionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionHour" ADD CONSTRAINT "SupervisionHour_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SupervisionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionHour" ADD CONSTRAINT "SupervisionHour_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewRequest" ADD CONSTRAINT "DocumentReviewRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentReviewRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
