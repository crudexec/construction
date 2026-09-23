BEGIN;

-- DropForeignKey
ALTER TABLE "AssetJobAssignment" DROP CONSTRAINT "AssetJobAssignment_projectId_fkey";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "currentProjectId" TEXT,
ADD COLUMN     "currentYardId" TEXT;

-- AlterTable
ALTER TABLE "AssetMeterReading" ADD COLUMN     "assignedPersonId" TEXT,
ADD COLUMN     "assignedPersonName" TEXT,
ADD COLUMN     "contextRecorded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "event" TEXT NOT NULL DEFAULT 'READING',
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "locationProjectId" TEXT,
ADD COLUMN     "locationYardId" TEXT;

-- AlterTable
ALTER TABLE "AssetJobAssignment" ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "yardId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssetYard" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetYard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetYard_companyId_name_key" ON "AssetYard"("companyId", "name");

-- CreateIndex
CREATE INDEX "Asset_currentProjectId_idx" ON "Asset"("currentProjectId");

-- CreateIndex
CREATE INDEX "Asset_currentYardId_idx" ON "Asset"("currentYardId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentProjectId_fkey" FOREIGN KEY ("currentProjectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentYardId_fkey" FOREIGN KEY ("currentYardId") REFERENCES "AssetYard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetYard" ADD CONSTRAINT "AssetYard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_yardId_fkey" FOREIGN KEY ("yardId") REFERENCES "AssetYard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve known job labels; do not infer locations for old meter readings or free text.
UPDATE "AssetJobAssignment" a SET "locationName" = p."title" FROM "Card" p WHERE a."projectId" = p."id";
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_one_location_check" CHECK ("currentProjectId" IS NULL OR "currentYardId" IS NULL);
ALTER TABLE "AssetJobAssignment" ADD CONSTRAINT "AssetJobAssignment_one_location_check" CHECK ("projectId" IS NULL OR "yardId" IS NULL);
ALTER TABLE "AssetMeterReading" ADD CONSTRAINT "AssetMeterReading_event_check" CHECK ("event" IN ('READING', 'ARRIVAL', 'DEPARTURE'));
COMMIT;
