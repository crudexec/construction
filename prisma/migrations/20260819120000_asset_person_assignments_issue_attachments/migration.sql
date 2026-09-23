-- Asset person assignment history and direct issue attachments.

-- Allow QR/public issue reports to create meter readings without an authenticated recorder.
ALTER TABLE "AssetMeterReading" ALTER COLUMN "recordedById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssetPersonAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetPersonAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetIssueAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetIssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetPersonAssignment_assetId_idx" ON "AssetPersonAssignment"("assetId");

-- CreateIndex
CREATE INDEX "AssetPersonAssignment_assigneeId_idx" ON "AssetPersonAssignment"("assigneeId");

-- CreateIndex
CREATE INDEX "AssetIssueAttachment_issueId_idx" ON "AssetIssueAttachment"("issueId");

-- AddForeignKey
ALTER TABLE "AssetPersonAssignment" ADD CONSTRAINT "AssetPersonAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPersonAssignment" ADD CONSTRAINT "AssetPersonAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPersonAssignment" ADD CONSTRAINT "AssetPersonAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetIssueAttachment" ADD CONSTRAINT "AssetIssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AssetIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetIssueAttachment" ADD CONSTRAINT "AssetIssueAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
