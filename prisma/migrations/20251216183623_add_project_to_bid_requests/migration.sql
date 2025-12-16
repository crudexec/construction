/*
  Warnings:

  - Added the required column `cardId` to the `BidRequest` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the column as nullable
ALTER TABLE "BidRequest" ADD COLUMN "cardId" TEXT;

-- Delete existing bid requests that don't have a project association (cleanup)
DELETE FROM "BidRequest";

-- Now make the column required
ALTER TABLE "BidRequest" ALTER COLUMN "cardId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "BidRequest_cardId_idx" ON "BidRequest"("cardId");

-- AddForeignKey
ALTER TABLE "BidRequest" ADD CONSTRAINT "BidRequest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
