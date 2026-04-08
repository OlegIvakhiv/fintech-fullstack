-- AlterTable
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "withdrawalType" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "WithdrawalRequest_withdrawalType_idx" ON "WithdrawalRequest"("withdrawalType");
