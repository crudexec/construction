-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "accessVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secret" TEXT,
    "pendingSecret" TEXT,
    "pendingExpiresAt" TIMESTAMP(3),
    "mfaEnabledAt" TIMESTAMP(3),
    "lastCounter" INTEGER NOT NULL DEFAULT -1,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PlatformSession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userVersion" INTEGER NOT NULL,
    "companyVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'COMPANY',
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "summary" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformSession_userId_idx" ON "PlatformSession"("userId");

-- CreateIndex
CREATE INDEX "PlatformSession_expiresAt_idx" ON "PlatformSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditEvent_companyId_createdAt_id_idx" ON "AuditEvent"("companyId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_scope_createdAt_id_idx" ON "AuditEvent"("scope", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_module_createdAt_idx" ON "AuditEvent"("module", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_outcome_createdAt_idx" ON "AuditEvent"("outcome", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_requestId_outcome_key" ON "AuditEvent"("requestId", "outcome");

-- AddForeignKey
ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSession" ADD CONSTRAINT "PlatformSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformAdmin"("userId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Application audit records cannot be edited or erased after insertion.
CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable';
END;
$$;
CREATE TRIGGER audit_event_immutable BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
