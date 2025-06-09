-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT');

-- CreateEnum
CREATE TYPE "CEUCategory" AS ENUM ('ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL');

-- CreateEnum
CREATE TYPE "PracticeLevel" AS ENUM ('INSTRUCTOR', 'CURATOR', 'SUPERVISOR');

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
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_number_key" ON "Certificate"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
