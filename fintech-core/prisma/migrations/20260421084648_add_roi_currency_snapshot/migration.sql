-- DropForeignKey
ALTER TABLE "BusinessUnitROI" DROP CONSTRAINT "BusinessUnitROI_businessUnitId_fkey";

-- AlterTable
ALTER TABLE "BusinessUnitROI" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
ALTER COLUMN "totalPoolValue" SET DEFAULT 0,
ALTER COLUMN "totalDistributed" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "BusinessUnitROI" ADD CONSTRAINT "BusinessUnitROI_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
