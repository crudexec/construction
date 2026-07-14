-- AlterTable: Card gets a human-readable project/job number
ALTER TABLE "Card" ADD COLUMN "projectNumber" TEXT;

-- AlterTable: VendorContract gets a companyId so contractNumber uniqueness can be
-- scoped per company instead of globally across the whole multi-tenant database
ALTER TABLE "VendorContract" ADD COLUMN "companyId" TEXT;

-- Backfill companyId from the contract's vendor
UPDATE "VendorContract"
SET "companyId" = "Vendor"."companyId"
FROM "Vendor"
WHERE "Vendor"."id" = "VendorContract"."vendorId";

ALTER TABLE "VendorContract" ALTER COLUMN "companyId" SET NOT NULL;

-- Replace the global unique constraint on contractNumber with a per-company one
DROP INDEX "VendorContract_contractNumber_key";

CREATE UNIQUE INDEX "VendorContract_companyId_contractNumber_key" ON "VendorContract"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "VendorContract_companyId_idx" ON "VendorContract"("companyId");

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ContractLineItem gets cost code + spec section metadata
ALTER TABLE "ContractLineItem" ADD COLUMN "costCodeId" TEXT;
ALTER TABLE "ContractLineItem" ADD COLUMN "specSection" TEXT;

-- CreateIndex
CREATE INDEX "ContractLineItem_costCodeId_idx" ON "ContractLineItem"("costCodeId");

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ChangeOrderLineItem gets cost code + spec section metadata
ALTER TABLE "ChangeOrderLineItem" ADD COLUMN "costCodeId" TEXT;
ALTER TABLE "ChangeOrderLineItem" ADD COLUMN "specSection" TEXT;

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_costCodeId_idx" ON "ChangeOrderLineItem"("costCodeId");

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
