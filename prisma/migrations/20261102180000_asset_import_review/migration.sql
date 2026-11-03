CREATE TABLE "AssetImportReview" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "sourceDigest" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3), "submittedBy" TEXT, "revision" INTEGER NOT NULL DEFAULT 0,
  "choices" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetImportReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetImportReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssetImportReview_tokenHash_key" ON "AssetImportReview"("tokenHash");
CREATE UNIQUE INDEX "AssetImportReview_companyId_sourceDigest_key" ON "AssetImportReview"("companyId", "sourceDigest");
CREATE INDEX "AssetImportReview_companyId_createdAt_idx" ON "AssetImportReview"("companyId", "createdAt");
CREATE TABLE "AssetImportReviewRow" (
  "id" TEXT NOT NULL, "reviewId" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "sourceFile" TEXT NOT NULL, "sourceRow" INTEGER NOT NULL, "sourceId" TEXT,
  "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "context" JSONB NOT NULL, "fields" JSONB NOT NULL, "source" JSONB NOT NULL,
  "decision" TEXT, "values" JSONB NOT NULL DEFAULT '{}', "notes" TEXT NOT NULL DEFAULT '',
  "reviewer" TEXT, "revision" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetImportReviewRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetImportReviewRow_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AssetImportReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssetImportReviewRow_reviewId_sourceFile_sourceRow_key" ON "AssetImportReviewRow"("reviewId", "sourceFile", "sourceRow");
CREATE INDEX "AssetImportReviewRow_reviewId_position_idx" ON "AssetImportReviewRow"("reviewId", "position");
CREATE TABLE "AssetImportReviewEvent" (
  "id" TEXT NOT NULL, "reviewId" TEXT NOT NULL, "rowId" TEXT, "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL, "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetImportReviewEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetImportReviewEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AssetImportReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AssetImportReviewEvent_reviewId_createdAt_idx" ON "AssetImportReviewEvent"("reviewId", "createdAt");
