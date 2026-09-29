-- DropForeignKey
ALTER TABLE "ChangeOrder" DROP CONSTRAINT "ChangeOrder_contractId_fkey";

-- AlterTable
ALTER TABLE "ChangeOrder" ADD COLUMN     "proposedRevision" JSONB,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisionStatus" "ChangeOrderStatus",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChangeOrderNote" (
    "id" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeOrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderEvent" (
    "id" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeOrderNote_changeOrderId_createdAt_idx" ON "ChangeOrderNote"("changeOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeOrderEvent_changeOrderId_createdAt_idx" ON "ChangeOrderEvent"("changeOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderNote" ADD CONSTRAINT "ChangeOrderNote_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderEvent" ADD CONSTRAINT "ChangeOrderEvent_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

