-- Add enums
CREATE TYPE "WithdrawalType" AS ENUM ('BUSINESS_UNIT_TO_ACCOUNT', 'BUSINESS_UNIT_TO_BUSINESS_UNIT', 'ACCOUNT_TO_EXTERNAL');
CREATE TYPE "WithdrawalMethod" AS ENUM ('CRYPTO', 'BANK_TRANSFER', 'CASH');

-- Add columns with DEFAULT for existing rows
ALTER TABLE "WithdrawalRequest" ADD COLUMN "withdrawalType" "WithdrawalType" NOT NULL DEFAULT 'BUSINESS_UNIT_TO_ACCOUNT';
ALTER TABLE "WithdrawalRequest" ADD COLUMN "fromBusinessUnitId" INTEGER;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "toBusinessUnitId" INTEGER;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "externalWallet" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "withdrawalMethod" "WithdrawalMethod";

-- Migrate existing businessUnitId to fromBusinessUnitId for existing records
UPDATE "WithdrawalRequest" SET "fromBusinessUnitId" = "businessUnitId" WHERE "businessUnitId" IS NOT NULL;

-- Add foreign key constraints
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_fromBusinessUnitId_fkey" 
  FOREIGN KEY ("fromBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_toBusinessUnitId_fkey" 
  FOREIGN KEY ("toBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old businessUnitId column (after migration to fromBusinessUnitId)
ALTER TABLE "WithdrawalRequest" DROP COLUMN "businessUnitId";

-- Update Prisma relations in BusinessUnit table if needed
-- This is handled by Prisma automatically