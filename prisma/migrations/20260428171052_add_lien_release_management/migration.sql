/*
  Warnings:

  - A unique constraint covering the columns `[portalEmail]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'EMAIL_SMS', 'ALL');

-- CreateEnum
CREATE TYPE "SMSProvider" AS ENUM ('NONE', 'AFRICAS_TALKING');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'BLACKLISTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('LUMP_SUM', 'REMEASURABLE', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LienReleaseType" AS ENUM ('CONDITIONAL_PROGRESS', 'UNCONDITIONAL_PROGRESS', 'CONDITIONAL_FINAL', 'UNCONDITIONAL_FINAL');

-- CreateEnum
CREATE TYPE "LienReleaseStatus" AS ENUM ('DRAFT', 'REQUESTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'VOID');

-- CreateEnum
CREATE TYPE "MilestoneChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'EQUIPMENT', 'TOOL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED');

-- CreateEnum
CREATE TYPE "AssetRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('NONE', 'SENDGRID', 'AWS_SES', 'SMTP', 'RESEND');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('STOCK_IN', 'STOCK_OUT');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL_SINGLE', 'RESIDENTIAL_MULTI', 'APARTMENT_COMPLEX', 'COMMERCIAL_OFFICE', 'COMMERCIAL_RETAIL', 'COMMERCIAL_INDUSTRIAL', 'MIXED_USE', 'LAND');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'UNDER_CONSTRUCTION', 'RENOVATION', 'INACTIVE', 'SOLD');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('STUDIO', 'ONE_BED', 'TWO_BED', 'THREE_BED', 'FOUR_BED_PLUS', 'OFFICE', 'RETAIL', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'NOTICE_GIVEN', 'MAKE_READY', 'DOWN', 'MODEL');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'PAST', 'EVICTED', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SCREENING', 'APPROVED', 'CONDITIONALLY_APPROVED', 'DENIED', 'WITHDRAWN', 'WAITLIST');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('FIXED_TERM', 'MONTH_TO_MONTH', 'CORPORATE', 'STUDENT');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'RENEWED', 'TERMINATED', 'EVICTION');

-- CreateEnum
CREATE TYPE "LateFeeType" AS ENUM ('FLAT', 'PERCENTAGE', 'DAILY', 'NONE');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('ANNUAL_FIXED', 'ANNUAL_PERCENT', 'CPI_LINKED');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('NOT_STARTED', 'OFFERED', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'RENEWAL_EXPIRED');

-- CreateEnum
CREATE TYPE "ScheduleActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScheduleRelationshipType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('CHANGE_ORDER', 'LIEN_RELEASE', 'PURCHASE_ORDER', 'VENDOR_CONTRACT', 'ESTIMATE', 'BID', 'INTENT_TO_AWARD', 'NON_COMPLIANCE_NOTICE', 'CUSTOM');

-- DropForeignKey
ALTER TABLE "public"."TaskComment" DROP CONSTRAINT "TaskComment_authorId_fkey";

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "appName" SET DEFAULT 'BuildFlo';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "smsError" TEXT,
ADD COLUMN     "smsMessageId" TEXT,
ADD COLUMN     "smsSentAt" TIMESTAMP(3),
ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "dueDateReminder1Day" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dueDateReminder2Day" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailTaskEscalated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "overdueReminderDaily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushTaskEscalated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsBidReceived" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsBidStatusChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsContractChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsDocumentShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsDueDateReminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsLowStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsMention" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsMilestoneReached" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsNewLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsPaymentRecorded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsPhoneNumber" TEXT,
ADD COLUMN     "smsPurchaseOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsQuietHoursEnd" INTEGER,
ADD COLUMN     "smsQuietHoursStart" INTEGER,
ADD COLUMN     "smsTaskAssigned" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsTaskCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsTaskEscalated" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "approvedAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "completionApprovedAt" TIMESTAMP(3),
ADD COLUMN     "completionApprovedById" TEXT,
ADD COLUMN     "completionPendingApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedBy" TEXT,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "isEscalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "TaskComment" ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "lastPortalLogin" TIMESTAMP(3),
ADD COLUMN     "portalEmail" TEXT,
ADD COLUMN     "portalPassword" TEXT,
ADD COLUMN     "portalToken" TEXT,
ADD COLUMN     "portalTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';

-- AlterTable
ALTER TABLE "VendorReview" ADD COLUMN     "documentationRating" DOUBLE PRECISION,
ADD COLUMN     "pricingAccuracyRating" DOUBLE PRECISION,
ADD COLUMN     "problemResolutionRating" DOUBLE PRECISION,
ADD COLUMN     "safetyComplianceRating" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaderId" TEXT,
    "uploadedByVendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPayment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoiceNumber" TEXT,
    "referenceNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "csiDivision" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorServiceTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "category" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorServiceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorServiceTagAssignment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorServiceTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedById" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VendorComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCommentAttachment" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorCommentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCommentMention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorCommentMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContactComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorContactComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT,
    "createdById" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "documenterUserId" TEXT,
    "assignedContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneChecklistItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "milestoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "totalSum" DOUBLE PRECISION NOT NULL,
    "retentionPercent" DOUBLE PRECISION DEFAULT 0,
    "retentionAmount" DOUBLE PRECISION,
    "warrantyYears" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContract" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "allocatedAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienRelease" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "contractId" TEXT,
    "projectId" TEXT,
    "type" "LienReleaseType" NOT NULL,
    "status" "LienReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "amount" DOUBLE PRECISION,
    "throughDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "externalPaymentRef" TEXT,
    "externalSource" TEXT,
    "requestedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "requestedById" TEXT,
    "submittedByVendor" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LienRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienReleaseDocument" (
    "id" TEXT NOT NULL,
    "lienReleaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedByVendor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LienReleaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienReleaseEvent" (
    "id" TEXT NOT NULL,
    "lienReleaseId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorVendorId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LienReleaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractLineItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "changeOrderNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderLineItem" (
    "id" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssetType" NOT NULL,
    "serialNumber" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLocation" TEXT,
    "currentAssigneeId" TEXT,
    "purchaseCost" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "photos" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRequest" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "projectId" TEXT,
    "purpose" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "AssetRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaintenanceType" NOT NULL DEFAULT 'ONE_TIME',
    "intervalDays" INTEGER,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastCompletedDate" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION,
    "assignedToId" TEXT,
    "alertUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "performedDate" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "defaultCost" DOUBLE PRECISION,
    "sku" TEXT,
    "photos" TEXT,
    "complianceInfo" TEXT,
    "companyId" TEXT NOT NULL,
    "preferredVendorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEntry" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "purchasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStockLevel" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchase" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT,
    "invoiceNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUsage" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL,
    "usedFor" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceComparison" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "minQuantity" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "leadTimeDays" INTEGER,
    "vendorSku" TEXT,
    "lastPurchaseDate" TIMESTAMP(3),
    "totalPurchasedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchasedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlertConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT,
    "projectId" TEXT,
    "recipientIds" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveredDate" TIMESTAMP(3),
    "notes" TEXT,
    "terms" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'NONE',
    "apiKey" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "testError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "SMSProvider" NOT NULL DEFAULT 'NONE',
    "apiKey" TEXT,
    "username" TEXT,
    "shortCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "testError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNotificationPreference" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsPhoneNumber" TEXT,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskDueReminder" BOOLEAN NOT NULL DEFAULT true,
    "milestoneUpdate" BOOLEAN NOT NULL DEFAULT true,
    "contractChange" BOOLEAN NOT NULL DEFAULT true,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT true,
    "purchaseOrderReceived" BOOLEAN NOT NULL DEFAULT true,
    "documentShared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitRate" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION,
    "procurementItemId" TEXT,
    "notes" TEXT,
    "specifications" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isContingency" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQPurchaseOrder" (
    "id" TEXT NOT NULL,
    "boqItemId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "quantityFulfilled" DOUBLE PRECISION NOT NULL,
    "unitCostActual" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BOQPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "description" TEXT,
    "totalEstimated" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotData" TEXT,

    CONSTRAINT "BOQRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "previousQty" DOUBLE PRECISION NOT NULL,
    "newQty" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Kenya',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "totalUnits" INTEGER NOT NULL DEFAULT 1,
    "totalSqft" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "stories" INTEGER,
    "parkingSpaces" INTEGER,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "currentValue" DOUBLE PRECISION,
    "managerId" TEXT,
    "sourceProjectId" TEXT,
    "description" TEXT,
    "photos" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "sqft" DOUBLE PRECISION,
    "floor" INTEGER,
    "marketRent" DOUBLE PRECISION,
    "currentRent" DOUBLE PRECISION,
    "depositAmount" DOUBLE PRECISION,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentLeaseId" TEXT,
    "currentTenantId" TEXT,
    "description" TEXT,
    "photos" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idType" TEXT,
    "idNumber" TEXT,
    "employer" TEXT,
    "jobTitle" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "employerPhone" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalPasswordHash" TEXT,
    "lastLogin" TIMESTAMP(3),
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantReference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApplication" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "currentAddress" TEXT,
    "employer" TEXT,
    "jobTitle" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "desiredMoveIn" TIMESTAMP(3),
    "desiredLeaseTerm" INTEGER,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "creditScore" INTEGER,
    "backgroundCheck" BOOLEAN,
    "incomeVerified" BOOLEAN,
    "referenceCheck" BOOLEAN,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "primaryTenantId" TEXT NOT NULL,
    "leaseNumber" TEXT,
    "type" "LeaseType" NOT NULL DEFAULT 'FIXED_TERM',
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "moveInDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "rentDueDay" INTEGER NOT NULL DEFAULT 1,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "lateFeeType" "LateFeeType" NOT NULL DEFAULT 'FLAT',
    "lateFeeAmount" DOUBLE PRECISION,
    "lateFeePercent" DOUBLE PRECISION,
    "securityDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "petDeposit" DOUBLE PRECISION,
    "otherDeposits" JSONB,
    "escalationType" "EscalationType",
    "escalationPercent" DOUBLE PRECISION,
    "escalationAmount" DOUBLE PRECISION,
    "escalationDate" TIMESTAMP(3),
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "petRent" DOUBLE PRECISION,
    "smokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxOccupants" INTEGER,
    "renewalStatus" "RenewalStatus",
    "renewalOfferedAt" TIMESTAMP(3),
    "renewalResponseDue" TIMESTAMP(3),
    "renewalLeaseId" TEXT,
    "noticeGivenAt" TIMESTAMP(3),
    "noticeRequiredDays" INTEGER NOT NULL DEFAULT 30,
    "moveOutReason" TEXT,
    "depositReturned" DOUBLE PRECISION,
    "depositDeductions" JSONB,
    "signedAt" TIMESTAMP(3),
    "signedByTenant" BOOLEAN NOT NULL DEFAULT false,
    "signedByLandlord" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "specialTerms" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseTenant" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "relationship" TEXT,
    "moveInDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseCharge" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleWBS" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "xerWbsId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isExpanded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleWBS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsId" TEXT,
    "xerTaskId" TEXT,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ScheduleActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedStart" TIMESTAMP(3),
    "plannedFinish" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "earlyStart" TIMESTAMP(3),
    "earlyFinish" TIMESTAMP(3),
    "lateStart" TIMESTAMP(3),
    "lateFinish" TIMESTAMP(3),
    "plannedDuration" DOUBLE PRECISION,
    "remainingDuration" DOUBLE PRECISION,
    "actualDuration" DOUBLE PRECISION,
    "totalFloat" DOUBLE PRECISION,
    "freeFloat" DOUBLE PRECISION,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "drivingPathFlag" BOOLEAN NOT NULL DEFAULT false,
    "activityType" TEXT,
    "constraintType" TEXT,
    "constraintDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkedTaskId" TEXT,
    "linkedMilestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRelationship" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "type" "ScheduleRelationshipType" NOT NULL DEFAULT 'FS',
    "lagHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xerPredId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleImport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedById" TEXT NOT NULL,
    "activitiesCount" INTEGER NOT NULL DEFAULT 0,
    "relationshipsCount" INTEGER NOT NULL DEFAULT 0,
    "wbsCount" INTEGER NOT NULL DEFAULT 0,
    "xerProjectId" TEXT,
    "xerProjectName" TEXT,
    "dataDate" TIMESTAMP(3),

    CONSTRAINT "ScheduleImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleActivityComment" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleActivityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DocumentTemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "parentId" TEXT,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folderId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareLink" TEXT,
    "shareLinkExpiry" TIMESTAMP(3),
    "vendorId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "category" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocumentTagAssignment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorDocumentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTagAssignment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidDocumentTagAssignment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidDocumentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocumentTagAssignment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocumentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX "TaskAttachment_uploadedByVendorId_idx" ON "TaskAttachment"("uploadedByVendorId");

-- CreateIndex
CREATE INDEX "TaskPayment_taskId_idx" ON "TaskPayment"("taskId");

-- CreateIndex
CREATE INDEX "TaskPayment_paymentDate_idx" ON "TaskPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "VendorCategory_companyId_idx" ON "VendorCategory"("companyId");

-- CreateIndex
CREATE INDEX "VendorCategory_csiDivision_idx" ON "VendorCategory"("csiDivision");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCategory_companyId_name_key" ON "VendorCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "VendorServiceTag_companyId_idx" ON "VendorServiceTag"("companyId");

-- CreateIndex
CREATE INDEX "VendorServiceTag_category_idx" ON "VendorServiceTag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "VendorServiceTag_companyId_name_key" ON "VendorServiceTag"("companyId", "name");

-- CreateIndex
CREATE INDEX "VendorServiceTagAssignment_vendorId_idx" ON "VendorServiceTagAssignment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorServiceTagAssignment_tagId_idx" ON "VendorServiceTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorServiceTagAssignment_vendorId_tagId_key" ON "VendorServiceTagAssignment"("vendorId", "tagId");

-- CreateIndex
CREATE INDEX "VendorComment_vendorId_idx" ON "VendorComment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorComment_authorId_idx" ON "VendorComment"("authorId");

-- CreateIndex
CREATE INDEX "VendorComment_parentId_idx" ON "VendorComment"("parentId");

-- CreateIndex
CREATE INDEX "VendorComment_createdAt_idx" ON "VendorComment"("createdAt");

-- CreateIndex
CREATE INDEX "VendorComment_isPinned_idx" ON "VendorComment"("isPinned");

-- CreateIndex
CREATE INDEX "VendorCommentAttachment_commentId_idx" ON "VendorCommentAttachment"("commentId");

-- CreateIndex
CREATE INDEX "VendorCommentAttachment_uploaderId_idx" ON "VendorCommentAttachment"("uploaderId");

-- CreateIndex
CREATE INDEX "VendorCommentMention_commentId_idx" ON "VendorCommentMention"("commentId");

-- CreateIndex
CREATE INDEX "VendorCommentMention_mentionedUserId_idx" ON "VendorCommentMention"("mentionedUserId");

-- CreateIndex
CREATE INDEX "VendorCommentMention_isRead_idx" ON "VendorCommentMention"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCommentMention_commentId_mentionedUserId_key" ON "VendorCommentMention"("commentId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "VendorContactComment_contactId_idx" ON "VendorContactComment"("contactId");

-- CreateIndex
CREATE INDEX "VendorContactComment_authorId_idx" ON "VendorContactComment"("authorId");

-- CreateIndex
CREATE INDEX "VendorContactComment_createdAt_idx" ON "VendorContactComment"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_vendorId_idx" ON "ProjectMilestone"("vendorId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");

-- CreateIndex
CREATE INDEX "ProjectMilestone_responsibleUserId_idx" ON "ProjectMilestone"("responsibleUserId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_assignedContactId_idx" ON "ProjectMilestone"("assignedContactId");

-- CreateIndex
CREATE INDEX "MilestoneChecklistItem_milestoneId_idx" ON "MilestoneChecklistItem"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneChecklistItem_status_idx" ON "MilestoneChecklistItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorContract_contractNumber_key" ON "VendorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "VendorContract_vendorId_idx" ON "VendorContract"("vendorId");

-- CreateIndex
CREATE INDEX "VendorContract_status_idx" ON "VendorContract"("status");

-- CreateIndex
CREATE INDEX "VendorContract_contractNumber_idx" ON "VendorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "ProjectContract_contractId_idx" ON "ProjectContract"("contractId");

-- CreateIndex
CREATE INDEX "ProjectContract_projectId_idx" ON "ProjectContract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContract_contractId_projectId_key" ON "ProjectContract"("contractId", "projectId");

-- CreateIndex
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");

-- CreateIndex
CREATE INDEX "ContractPayment_contractId_idx" ON "ContractPayment"("contractId");

-- CreateIndex
CREATE INDEX "ContractPayment_createdById_idx" ON "ContractPayment"("createdById");

-- CreateIndex
CREATE INDEX "ContractPayment_paymentDate_idx" ON "ContractPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "LienRelease_companyId_status_idx" ON "LienRelease"("companyId", "status");

-- CreateIndex
CREATE INDEX "LienRelease_vendorId_status_idx" ON "LienRelease"("vendorId", "status");

-- CreateIndex
CREATE INDEX "LienRelease_contractId_idx" ON "LienRelease"("contractId");

-- CreateIndex
CREATE INDEX "LienRelease_projectId_idx" ON "LienRelease"("projectId");

-- CreateIndex
CREATE INDEX "LienRelease_throughDate_idx" ON "LienRelease"("throughDate");

-- CreateIndex
CREATE INDEX "LienReleaseDocument_lienReleaseId_idx" ON "LienReleaseDocument"("lienReleaseId");

-- CreateIndex
CREATE INDEX "LienReleaseEvent_lienReleaseId_createdAt_idx" ON "LienReleaseEvent"("lienReleaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractLineItem_contractId_idx" ON "ContractLineItem"("contractId");

-- CreateIndex
CREATE INDEX "ChangeOrder_contractId_idx" ON "ChangeOrder"("contractId");

-- CreateIndex
CREATE INDEX "ChangeOrder_status_idx" ON "ChangeOrder"("status");

-- CreateIndex
CREATE INDEX "ChangeOrder_createdById_idx" ON "ChangeOrder"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrder_contractId_changeOrderNumber_key" ON "ChangeOrder"("contractId", "changeOrderNumber");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_changeOrderId_idx" ON "ChangeOrderLineItem"("changeOrderId");

-- CreateIndex
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_currentAssigneeId_idx" ON "Asset"("currentAssigneeId");

-- CreateIndex
CREATE INDEX "AssetRequest_assetId_idx" ON "AssetRequest"("assetId");

-- CreateIndex
CREATE INDEX "AssetRequest_requesterId_idx" ON "AssetRequest"("requesterId");

-- CreateIndex
CREATE INDEX "AssetRequest_status_idx" ON "AssetRequest"("status");

-- CreateIndex
CREATE INDEX "AssetRequest_projectId_idx" ON "AssetRequest"("projectId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_assetId_idx" ON "MaintenanceSchedule"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_nextDueDate_idx" ON "MaintenanceSchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_isActive_idx" ON "MaintenanceSchedule"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assetId_idx" ON "MaintenanceRecord"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_scheduleId_idx" ON "MaintenanceRecord"("scheduleId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_performedDate_idx" ON "MaintenanceRecord"("performedDate");

-- CreateIndex
CREATE INDEX "ProcurementItem_companyId_idx" ON "ProcurementItem"("companyId");

-- CreateIndex
CREATE INDEX "ProcurementItem_category_idx" ON "ProcurementItem"("category");

-- CreateIndex
CREATE INDEX "ProcurementItem_preferredVendorId_idx" ON "ProcurementItem"("preferredVendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementItem_companyId_sku_key" ON "ProcurementItem"("companyId", "sku");

-- CreateIndex
CREATE INDEX "InventoryEntry_itemId_idx" ON "InventoryEntry"("itemId");

-- CreateIndex
CREATE INDEX "InventoryEntry_projectId_idx" ON "InventoryEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntry_itemId_projectId_key" ON "InventoryEntry"("itemId", "projectId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_inventoryId_idx" ON "InventoryPurchase"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_purchaseDate_idx" ON "InventoryPurchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "InventoryPurchase_supplierId_idx" ON "InventoryPurchase"("supplierId");

-- CreateIndex
CREATE INDEX "InventoryUsage_inventoryId_idx" ON "InventoryUsage"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryUsage_usageDate_idx" ON "InventoryUsage"("usageDate");

-- CreateIndex
CREATE INDEX "PriceComparison_itemId_idx" ON "PriceComparison"("itemId");

-- CreateIndex
CREATE INDEX "PriceComparison_vendorId_idx" ON "PriceComparison"("vendorId");

-- CreateIndex
CREATE INDEX "PriceComparison_isPreferred_idx" ON "PriceComparison"("isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "PriceComparison_itemId_vendorId_key" ON "PriceComparison"("itemId", "vendorId");

-- CreateIndex
CREATE INDEX "StockAlertConfig_companyId_idx" ON "StockAlertConfig"("companyId");

-- CreateIndex
CREATE INDEX "StockAlertConfig_itemId_idx" ON "StockAlertConfig"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_idx" ON "PurchaseOrder"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_companyId_orderNumber_key" ON "PurchaseOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_itemId_idx" ON "PurchaseOrderItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfig_companyId_key" ON "EmailConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SMSConfig_companyId_key" ON "SMSConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorNotificationPreference_vendorId_key" ON "VendorNotificationPreference"("vendorId");

-- CreateIndex
CREATE INDEX "BOQItem_projectId_idx" ON "BOQItem"("projectId");

-- CreateIndex
CREATE INDEX "BOQItem_category_idx" ON "BOQItem"("category");

-- CreateIndex
CREATE INDEX "BOQItem_procurementItemId_idx" ON "BOQItem"("procurementItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BOQItem_projectId_itemNumber_key" ON "BOQItem"("projectId", "itemNumber");

-- CreateIndex
CREATE INDEX "BOQPurchaseOrder_boqItemId_idx" ON "BOQPurchaseOrder"("boqItemId");

-- CreateIndex
CREATE INDEX "BOQPurchaseOrder_purchaseOrderId_idx" ON "BOQPurchaseOrder"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BOQPurchaseOrder_boqItemId_purchaseOrderId_key" ON "BOQPurchaseOrder"("boqItemId", "purchaseOrderId");

-- CreateIndex
CREATE INDEX "BOQRevision_projectId_idx" ON "BOQRevision"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BOQRevision_projectId_revisionNumber_key" ON "BOQRevision"("projectId", "revisionNumber");

-- CreateIndex
CREATE INDEX "InventoryCategory_companyId_idx" ON "InventoryCategory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_companyId_name_key" ON "InventoryCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "InventoryMaterial_companyId_idx" ON "InventoryMaterial"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMaterial_categoryId_idx" ON "InventoryMaterial"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMaterial_companyId_sku_key" ON "InventoryMaterial"("companyId", "sku");

-- CreateIndex
CREATE INDEX "InventoryTransaction_materialId_idx" ON "InventoryTransaction"("materialId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_projectId_idx" ON "InventoryTransaction"("projectId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_userId_idx" ON "InventoryTransaction"("userId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_sourceProjectId_key" ON "Property"("sourceProjectId");

-- CreateIndex
CREATE INDEX "Property_companyId_idx" ON "Property"("companyId");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_managerId_idx" ON "Property"("managerId");

-- CreateIndex
CREATE INDEX "Unit_propertyId_idx" ON "Unit"("propertyId");

-- CreateIndex
CREATE INDEX "Unit_type_idx" ON "Unit"("type");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_propertyId_unitNumber_key" ON "Unit"("propertyId", "unitNumber");

-- CreateIndex
CREATE INDEX "Tenant_companyId_idx" ON "Tenant"("companyId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_email_idx" ON "Tenant"("email");

-- CreateIndex
CREATE INDEX "TenantReference_tenantId_idx" ON "TenantReference"("tenantId");

-- CreateIndex
CREATE INDEX "TenantApplication_companyId_idx" ON "TenantApplication"("companyId");

-- CreateIndex
CREATE INDEX "TenantApplication_propertyId_idx" ON "TenantApplication"("propertyId");

-- CreateIndex
CREATE INDEX "TenantApplication_status_idx" ON "TenantApplication"("status");

-- CreateIndex
CREATE INDEX "Lease_companyId_idx" ON "Lease"("companyId");

-- CreateIndex
CREATE INDEX "Lease_propertyId_idx" ON "Lease"("propertyId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_primaryTenantId_idx" ON "Lease"("primaryTenantId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "Lease_startDate_endDate_idx" ON "Lease"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaseTenant_leaseId_idx" ON "LeaseTenant"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseTenant_tenantId_idx" ON "LeaseTenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseTenant_leaseId_tenantId_key" ON "LeaseTenant"("leaseId", "tenantId");

-- CreateIndex
CREATE INDEX "LeaseCharge_leaseId_idx" ON "LeaseCharge"("leaseId");

-- CreateIndex
CREATE INDEX "ScheduleWBS_projectId_idx" ON "ScheduleWBS"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleWBS_parentId_idx" ON "ScheduleWBS"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleWBS_projectId_xerWbsId_key" ON "ScheduleWBS"("projectId", "xerWbsId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_projectId_idx" ON "ScheduleActivity"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_wbsId_idx" ON "ScheduleActivity"("wbsId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_isCritical_idx" ON "ScheduleActivity"("isCritical");

-- CreateIndex
CREATE INDEX "ScheduleActivity_status_idx" ON "ScheduleActivity"("status");

-- CreateIndex
CREATE INDEX "ScheduleActivity_linkedTaskId_idx" ON "ScheduleActivity"("linkedTaskId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_linkedMilestoneId_idx" ON "ScheduleActivity"("linkedMilestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleActivity_projectId_xerTaskId_key" ON "ScheduleActivity"("projectId", "xerTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleActivity_projectId_activityId_key" ON "ScheduleActivity"("projectId", "activityId");

-- CreateIndex
CREATE INDEX "ScheduleRelationship_projectId_idx" ON "ScheduleRelationship"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleRelationship_predecessorId_idx" ON "ScheduleRelationship"("predecessorId");

-- CreateIndex
CREATE INDEX "ScheduleRelationship_successorId_idx" ON "ScheduleRelationship"("successorId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRelationship_predecessorId_successorId_key" ON "ScheduleRelationship"("predecessorId", "successorId");

-- CreateIndex
CREATE INDEX "ScheduleImport_projectId_idx" ON "ScheduleImport"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleActivityComment_activityId_idx" ON "ScheduleActivityComment"("activityId");

-- CreateIndex
CREATE INDEX "ScheduleActivityComment_authorId_idx" ON "ScheduleActivityComment"("authorId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_companyId_type_idx" ON "DocumentTemplate"("companyId", "type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_createdById_idx" ON "DocumentTemplate"("createdById");

-- CreateIndex
CREATE INDEX "VendorFolder_vendorId_idx" ON "VendorFolder"("vendorId");

-- CreateIndex
CREATE INDEX "VendorFolder_parentId_idx" ON "VendorFolder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorFolder_vendorId_name_parentId_key" ON "VendorFolder"("vendorId", "name", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocument_shareLink_key" ON "VendorDocument"("shareLink");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_idx" ON "VendorDocument"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDocument_folderId_idx" ON "VendorDocument"("folderId");

-- CreateIndex
CREATE INDEX "VendorDocument_shareLink_idx" ON "VendorDocument"("shareLink");

-- CreateIndex
CREATE INDEX "FileTag_companyId_idx" ON "FileTag"("companyId");

-- CreateIndex
CREATE INDEX "FileTag_category_idx" ON "FileTag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "FileTag_companyId_name_key" ON "FileTag"("companyId", "name");

-- CreateIndex
CREATE INDEX "VendorDocumentTagAssignment_documentId_idx" ON "VendorDocumentTagAssignment"("documentId");

-- CreateIndex
CREATE INDEX "VendorDocumentTagAssignment_tagId_idx" ON "VendorDocumentTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocumentTagAssignment_documentId_tagId_key" ON "VendorDocumentTagAssignment"("documentId", "tagId");

-- CreateIndex
CREATE INDEX "DocumentTagAssignment_documentId_idx" ON "DocumentTagAssignment"("documentId");

-- CreateIndex
CREATE INDEX "DocumentTagAssignment_tagId_idx" ON "DocumentTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTagAssignment_documentId_tagId_key" ON "DocumentTagAssignment"("documentId", "tagId");

-- CreateIndex
CREATE INDEX "BidDocumentTagAssignment_documentId_idx" ON "BidDocumentTagAssignment"("documentId");

-- CreateIndex
CREATE INDEX "BidDocumentTagAssignment_tagId_idx" ON "BidDocumentTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "BidDocumentTagAssignment_documentId_tagId_key" ON "BidDocumentTagAssignment"("documentId", "tagId");

-- CreateIndex
CREATE INDEX "ContractDocumentTagAssignment_documentId_idx" ON "ContractDocumentTagAssignment"("documentId");

-- CreateIndex
CREATE INDEX "ContractDocumentTagAssignment_tagId_idx" ON "ContractDocumentTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractDocumentTagAssignment_documentId_tagId_key" ON "ContractDocumentTagAssignment"("documentId", "tagId");

-- CreateIndex
CREATE INDEX "Notification_vendorId_idx" ON "Notification"("vendorId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Task_vendorId_idx" ON "Task"("vendorId");

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "Task_isEscalated_idx" ON "Task"("isEscalated");

-- CreateIndex
CREATE INDEX "Task_completionPendingApproval_idx" ON "Task"("completionPendingApproval");

-- CreateIndex
CREATE INDEX "TaskComment_vendorId_idx" ON "TaskComment"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_portalEmail_key" ON "Vendor"("portalEmail");

-- CreateIndex
CREATE INDEX "Vendor_categoryId_idx" ON "Vendor"("categoryId");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_portalEmail_idx" ON "Vendor"("portalEmail");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completionApprovedById_fkey" FOREIGN KEY ("completionApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploadedByVendorId_fkey" FOREIGN KEY ("uploadedByVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPayment" ADD CONSTRAINT "TaskPayment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPayment" ADD CONSTRAINT "TaskPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VendorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCategory" ADD CONSTRAINT "VendorCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceTag" ADD CONSTRAINT "VendorServiceTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceTagAssignment" ADD CONSTRAINT "VendorServiceTagAssignment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceTagAssignment" ADD CONSTRAINT "VendorServiceTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "VendorServiceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VendorComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCommentAttachment" ADD CONSTRAINT "VendorCommentAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "VendorComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCommentAttachment" ADD CONSTRAINT "VendorCommentAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCommentMention" ADD CONSTRAINT "VendorCommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "VendorComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCommentMention" ADD CONSTRAINT "VendorCommentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContactComment" ADD CONSTRAINT "VendorContactComment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "VendorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContactComment" ADD CONSTRAINT "VendorContactComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_documenterUserId_fkey" FOREIGN KEY ("documenterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_assignedContactId_fkey" FOREIGN KEY ("assignedContactId") REFERENCES "VendorContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneChecklistItem" ADD CONSTRAINT "MilestoneChecklistItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneChecklistItem" ADD CONSTRAINT "MilestoneChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPayment" ADD CONSTRAINT "ContractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPayment" ADD CONSTRAINT "ContractPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienRelease" ADD CONSTRAINT "LienRelease_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienReleaseDocument" ADD CONSTRAINT "LienReleaseDocument_lienReleaseId_fkey" FOREIGN KEY ("lienReleaseId") REFERENCES "LienRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienReleaseDocument" ADD CONSTRAINT "LienReleaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienReleaseEvent" ADD CONSTRAINT "LienReleaseEvent_lienReleaseId_fkey" FOREIGN KEY ("lienReleaseId") REFERENCES "LienRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienReleaseEvent" ADD CONSTRAINT "LienReleaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienReleaseEvent" ADD CONSTRAINT "LienReleaseEvent_actorVendorId_fkey" FOREIGN KEY ("actorVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentAssigneeId_fkey" FOREIGN KEY ("currentAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementItem" ADD CONSTRAINT "ProcurementItem_preferredVendorId_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntry" ADD CONSTRAINT "InventoryEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProcurementItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntry" ADD CONSTRAINT "InventoryEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "InventoryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "InventoryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceComparison" ADD CONSTRAINT "PriceComparison_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProcurementItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceComparison" ADD CONSTRAINT "PriceComparison_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlertConfig" ADD CONSTRAINT "StockAlertConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProcurementItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSConfig" ADD CONSTRAINT "SMSConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNotificationPreference" ADD CONSTRAINT "VendorNotificationPreference_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_procurementItemId_fkey" FOREIGN KEY ("procurementItemId") REFERENCES "ProcurementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQPurchaseOrder" ADD CONSTRAINT "BOQPurchaseOrder_boqItemId_fkey" FOREIGN KEY ("boqItemId") REFERENCES "BOQItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQPurchaseOrder" ADD CONSTRAINT "BOQPurchaseOrder_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQRevision" ADD CONSTRAINT "BOQRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQRevision" ADD CONSTRAINT "BOQRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMaterial" ADD CONSTRAINT "InventoryMaterial_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMaterial" ADD CONSTRAINT "InventoryMaterial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InventoryMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReference" ADD CONSTRAINT "TenantReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_primaryTenantId_fkey" FOREIGN KEY ("primaryTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseTenant" ADD CONSTRAINT "LeaseTenant_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseTenant" ADD CONSTRAINT "LeaseTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseCharge" ADD CONSTRAINT "LeaseCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWBS" ADD CONSTRAINT "ScheduleWBS_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWBS" ADD CONSTRAINT "ScheduleWBS_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ScheduleWBS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivity" ADD CONSTRAINT "ScheduleActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivity" ADD CONSTRAINT "ScheduleActivity_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "ScheduleWBS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivity" ADD CONSTRAINT "ScheduleActivity_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivity" ADD CONSTRAINT "ScheduleActivity_linkedMilestoneId_fkey" FOREIGN KEY ("linkedMilestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRelationship" ADD CONSTRAINT "ScheduleRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRelationship" ADD CONSTRAINT "ScheduleRelationship_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRelationship" ADD CONSTRAINT "ScheduleRelationship_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleImport" ADD CONSTRAINT "ScheduleImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivityComment" ADD CONSTRAINT "ScheduleActivityComment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivityComment" ADD CONSTRAINT "ScheduleActivityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFolder" ADD CONSTRAINT "VendorFolder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFolder" ADD CONSTRAINT "VendorFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VendorFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "VendorFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileTag" ADD CONSTRAINT "FileTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentTagAssignment" ADD CONSTRAINT "VendorDocumentTagAssignment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VendorDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentTagAssignment" ADD CONSTRAINT "VendorDocumentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTagAssignment" ADD CONSTRAINT "DocumentTagAssignment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTagAssignment" ADD CONSTRAINT "DocumentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidDocumentTagAssignment" ADD CONSTRAINT "BidDocumentTagAssignment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "BidDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidDocumentTagAssignment" ADD CONSTRAINT "BidDocumentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocumentTagAssignment" ADD CONSTRAINT "ContractDocumentTagAssignment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContractDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocumentTagAssignment" ADD CONSTRAINT "ContractDocumentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
