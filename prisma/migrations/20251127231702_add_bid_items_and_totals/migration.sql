-- AlterTable
ALTER TABLE "Bid" ADD COLUMN "discount" REAL;
ALTER TABLE "Bid" ADD COLUMN "subtotal" REAL;
ALTER TABLE "Bid" ADD COLUMN "tax" REAL;

-- CreateTable
CREATE TABLE "BidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BidItem_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BidItem_bidId_idx" ON "BidItem"("bidId");
