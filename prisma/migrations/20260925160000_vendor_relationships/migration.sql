BEGIN;
ALTER TABLE "VendorContact" ADD COLUMN "notes" TEXT;
ALTER TABLE "VendorSupplier" ADD COLUMN "linkedVendorId" TEXT;
ALTER TABLE "VendorSupplier" ADD CONSTRAINT "VendorSupplier_linkedVendorId_fkey"
  FOREIGN KEY ("linkedVendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "VendorSupplier_vendorId_linkedVendorId_key" ON "VendorSupplier"("vendorId", "linkedVendorId");
CREATE INDEX "VendorSupplier_linkedVendorId_idx" ON "VendorSupplier"("linkedVendorId");
COMMIT;
