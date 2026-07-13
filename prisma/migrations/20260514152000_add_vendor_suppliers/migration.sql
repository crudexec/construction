CREATE TABLE "VendorSupplier" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VendorSupplier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorSupplier_vendorId_idx" ON "VendorSupplier"("vendorId");

ALTER TABLE "VendorSupplier"
ADD CONSTRAINT "VendorSupplier_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
