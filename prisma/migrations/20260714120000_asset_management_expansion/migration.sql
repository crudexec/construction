-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('CASH', 'FINANCED', 'LEASED');

-- CreateEnum
CREATE TYPE "AssetAttachmentCategory" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AssetCustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "AssetMeterReadingType" AS ENUM ('HOURS', 'MILES');

-- CreateEnum
CREATE TYPE "AssetInspectionType" AS ENUM ('DOT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceServiceType" AS ENUM ('OIL_CHANGE', 'FUEL', 'HYDRAULIC_FLUID', 'FILTER_OIL', 'FILTER_FUEL', 'FILTER_HYDRAULIC', 'OTHER');

-- AlterTable: Asset gets identity, purchase, and custom-status-note fields
ALTER TABLE "Asset"
  ADD COLUMN "customStatusNote" TEXT,
  ADD COLUMN "make" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "vin" TEXT,
  ADD COLUMN "licensePlate" TEXT,
  ADD COLUMN "purchasedFromVendorId" TEXT,
  ADD COLUMN "poNumber" TEXT,
  ADD COLUMN "invoiceNumber" TEXT,
  ADD COLUMN "financingType" "FinancingType",
  ADD COLUMN "financedAmount" DOUBLE PRECISION,
  ADD COLUMN "lender" TEXT,
  ADD COLUMN "loanTermMonths" INTEGER,
  ADD COLUMN "depreciationMethod" TEXT,
  ADD COLUMN "usefulLifeYears" INTEGER,
  ADD COLUMN "salvageValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AssetAttachment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" "AssetAttachmentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAttachment_pkey" PRIMARY KEY ("id")
);

-- Backfill: migrate any existing Asset.photos JSON array into AssetAttachment rows
INSERT INTO "AssetAttachment" ("id", "assetId", "category", "fileName", "fileSize", "mimeType", "url", "createdAt")
SELECT
  'legacy_photo_' || a."id" || '_' || row_number() OVER (PARTITION BY a."id"),
  a."id",
  'PHOTO',
  split_part(photo_url, '/', -1),
  0,
  'image/jpeg',
  photo_url,
  CURRENT_TIMESTAMP
FROM "Asset" a,
  LATERAL json_array_elements_text(
    CASE
      WHEN a."photos" IS NOT NULL AND a."photos" != '' THEN a."photos"::json
      ELSE '[]'::json
    END
  ) AS photo_url;

-- AlterTable: drop the now-migrated photos column
ALTER TABLE "Asset" DROP COLUMN "photos";

-- CreateIndex
CREATE INDEX "AssetAttachment_assetId_idx" ON "AssetAttachment"("assetId");

-- CreateIndex
CREATE INDEX "AssetAttachment_category_idx" ON "AssetAttachment"("category");

-- AddForeignKey
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_purchasedFromVendorId_fkey" FOREIGN KEY ("purchasedFromVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Asset_purchasedFromVendorId_idx" ON "Asset"("purchasedFromVendorId");

-- CreateTable
CREATE TABLE "AssetRentalRate" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "dailyRate" DOUBLE PRECISION,
    "monthlyRate" DOUBLE PRECISION,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetRentalRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetRentalRate_assetId_createdAt_idx" ON "AssetRentalRate"("assetId", "createdAt");

-- AddForeignKey
ALTER TABLE "AssetRentalRate" ADD CONSTRAINT "AssetRentalRate_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRentalRate" ADD CONSTRAINT "AssetRentalRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetCustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" "AssetCustomFieldType" NOT NULL,
    "selectOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCustomFieldDefinition_companyId_idx" ON "AssetCustomFieldDefinition"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCustomFieldDefinition_companyId_name_key" ON "AssetCustomFieldDefinition"("companyId", "name");

-- AddForeignKey
ALTER TABLE "AssetCustomFieldDefinition" ADD CONSTRAINT "AssetCustomFieldDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetCustomFieldValue" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetCustomFieldValue_assetId_fieldDefinitionId_key" ON "AssetCustomFieldValue"("assetId", "fieldDefinitionId");

-- AddForeignKey
ALTER TABLE "AssetCustomFieldValue" ADD CONSTRAINT "AssetCustomFieldValue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCustomFieldValue" ADD CONSTRAINT "AssetCustomFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "AssetCustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetMeterReading" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "readingType" "AssetMeterReadingType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetMeterReading_assetId_readingType_recordedAt_idx" ON "AssetMeterReading"("assetId", "readingType", "recordedAt");

-- AddForeignKey
ALTER TABLE "AssetMeterReading" ADD CONSTRAINT "AssetMeterReading_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMeterReading" ADD CONSTRAINT "AssetMeterReading_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetJobAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetJobAssignment_assetId_idx" ON "AssetJobAssignment"("assetId");

-- CreateIndex
CREATE INDEX "AssetJobAssignment_projectId_idx" ON "AssetJobAssignment"("projectId");

-- AddForeignKey
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetInspection" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "inspectionType" "AssetInspectionType" NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectorName" TEXT,
    "certificateNumber" TEXT,
    "passed" BOOLEAN NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetInspection_assetId_idx" ON "AssetInspection"("assetId");

-- CreateIndex
CREATE INDEX "AssetInspection_expiryDate_idx" ON "AssetInspection"("expiryDate");

-- AddForeignKey
ALTER TABLE "AssetInspection" ADD CONSTRAINT "AssetInspection_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetInspection" ADD CONSTRAINT "AssetInspection_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: MaintenanceRecord gets structured service-log fields
ALTER TABLE "MaintenanceRecord"
  ADD COLUMN "serviceType" "MaintenanceServiceType",
  ADD COLUMN "quantity" DOUBLE PRECISION,
  ADD COLUMN "quantityUnit" TEXT,
  ADD COLUMN "meterReadingAtService" DOUBLE PRECISION;
