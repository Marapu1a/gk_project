/*
  Warnings:

  - A unique constraint covering the columns `[provider,externalPaymentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider,externalCustomerCode]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('TOCHKA');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "externalCustomerCode" TEXT,
ADD COLUMN "externalPaymentId" TEXT,
ADD COLUMN "paymentUrl" TEXT,
ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'TOCHKA',
ADD COLUMN "providerPayload" JSONB,
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill for existing rows
UPDATE "Payment"
SET "updatedAt" = COALESCE("confirmedAt", "createdAt")
WHERE "updatedAt" IS NULL;

-- Make updatedAt required after backfill
ALTER TABLE "Payment"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT,
    "externalEventId" TEXT,
    "externalPaymentId" TEXT,
    "externalCustomerCode" TEXT,
    "paymentId" TEXT,
    "isValidSignature" BOOLEAN NOT NULL DEFAULT false,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "statusBefore" "PaymentStatus",
    "statusAfter" "PaymentStatus",
    "rawBody" TEXT NOT NULL,
    "payloadJson" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_externalPaymentId_idx" ON "PaymentWebhookEvent"("provider", "externalPaymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_externalCustomerCode_idx" ON "PaymentWebhookEvent"("provider", "externalCustomerCode");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_externalPaymentId_key" ON "Payment"("provider", "externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_externalCustomerCode_key" ON "Payment"("provider", "externalCustomerCode");

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent"
ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
