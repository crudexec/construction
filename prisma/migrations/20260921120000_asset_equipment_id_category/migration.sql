-- Optional fields preserve existing assets and their stable internal IDs.
ALTER TABLE "Asset"
ADD COLUMN "equipmentId" VARCHAR(100),
ADD COLUMN "category" VARCHAR(100);

-- PostgreSQL permits multiple NULL IDs; entered IDs are unique per company.
CREATE UNIQUE INDEX "Asset_companyId_equipmentId_key" ON "Asset"("companyId", "equipmentId");
CREATE INDEX "Asset_companyId_type_category_idx" ON "Asset"("companyId", "type", "category");
