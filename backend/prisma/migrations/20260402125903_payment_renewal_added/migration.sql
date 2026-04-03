-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'RENEWAL';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "targetLevel" "TargetLevel";

-- CreateIndex
CREATE INDEX "Payment_type_targetLevel_idx" ON "Payment"("type", "targetLevel");
