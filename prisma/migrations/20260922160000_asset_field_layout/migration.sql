BEGIN;
CREATE TABLE "AssetFieldLayout" (
    "companyId" TEXT NOT NULL,
    "fieldOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetFieldLayout_pkey" PRIMARY KEY ("companyId"),
    CONSTRAINT "AssetFieldLayout_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
COMMIT;
