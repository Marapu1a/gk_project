-- CreateEnum
CREATE TYPE "ConsentDocumentType" AS ENUM ('TRANSBORDER_PD_TRANSFER');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('REGISTRATION_MODAL', 'LEGACY_MODAL');

-- CreateEnum
CREATE TYPE "ConsentEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "ConsentDocumentType" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "documentTextHash" TEXT NOT NULL,
    "acceptedItems" JSONB NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "emailAtMoment" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "clientId" TEXT,
    "requestId" TEXT,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailStatus" "ConsentEmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConsent_userId_idx" ON "UserConsent"("userId");

-- CreateIndex
CREATE INDEX "UserConsent_documentType_documentVersion_idx" ON "UserConsent"("documentType", "documentVersion");

-- CreateIndex
CREATE INDEX "UserConsent_consentedAt_idx" ON "UserConsent"("consentedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_documentType_documentVersion_key" ON "UserConsent"("userId", "documentType", "documentVersion");

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
