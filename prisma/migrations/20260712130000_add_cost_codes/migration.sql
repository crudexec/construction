-- CreateTable
CREATE TABLE "CostCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "csiDivision" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCode_companyId_idx" ON "CostCode"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_companyId_code_key" ON "CostCode"("companyId", "code");

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "BOQItem" ADD COLUMN "costCodeId" TEXT;

-- CreateIndex
CREATE INDEX "BOQItem_costCodeId_idx" ON "BOQItem"("costCodeId");

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
