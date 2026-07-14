-- AlterTable: VendorContract gets a preserved original estimate amount
ALTER TABLE "VendorContract" ADD COLUMN "estimateAmount" DOUBLE PRECISION;

-- CreateTable: links a vendor's suppliers/subtiers to a specific contract
CREATE TABLE "ContractSupplier" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "vendorSupplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractSupplier_contractId_idx" ON "ContractSupplier"("contractId");

-- CreateIndex
CREATE INDEX "ContractSupplier_vendorSupplierId_idx" ON "ContractSupplier"("vendorSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSupplier_contractId_vendorSupplierId_key" ON "ContractSupplier"("contractId", "vendorSupplierId");

-- AddForeignKey
ALTER TABLE "ContractSupplier" ADD CONSTRAINT "ContractSupplier_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSupplier" ADD CONSTRAINT "ContractSupplier_vendorSupplierId_fkey" FOREIGN KEY ("vendorSupplierId") REFERENCES "VendorSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: LienRelease can optionally reference a specific supplier/subtier
ALTER TABLE "LienRelease" ADD COLUMN "vendorSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "LienRelease_vendorSupplierId_idx" ON "LienRelease"("vendorSupplierId");

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_vendorSupplierId_fkey" FOREIGN KEY ("vendorSupplierId") REFERENCES "VendorSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
