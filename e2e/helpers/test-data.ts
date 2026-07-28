import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

export interface ContractComplianceFixture {
  companyId: string
  user: {
    id: string
    email: string
    password: string
  }
  projectId: string
  vendorId: string
  contractId: string
  paymentId: string
  costCodeId: string
  approvedLienReleaseId: string
  pendingLienReleaseId: string
  contractNumber: string
}

export async function createContractComplianceFixture(): Promise<ContractComplianceFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const password = 'Playwright123!'
  const company = await prisma.company.create({
    data: {
      name: `E2E Build Co ${suffix}`,
      appName: 'BuildFlo',
      email: `e2e-${suffix}@example.com`,
      currency: 'USD',
    },
  })

  const user = await prisma.user.create({
    data: {
      email: `admin-${suffix}@example.com`,
      password: await hash(password, 10),
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'ADMIN',
      companyId: company.id,
      isActive: true,
    },
  })

  const stage = await prisma.stage.create({
    data: {
      name: 'Active',
      color: '#2563eb',
      order: 0,
      companyId: company.id,
    },
  })

  const project = await prisma.card.create({
    data: {
      title: `E2E Project ${suffix}`,
      projectNumber: `E2E-${suffix}`,
      stageId: stage.id,
      companyId: company.id,
      ownerId: user.id,
    },
  })

  const costCode = await prisma.costCode.create({
    data: {
      code: `E2E-${suffix}`,
      name: 'E2E Pay App Cost Code',
      description: 'Cost code used by ACA pay app Playwright coverage',
      companyId: company.id,
    },
  })

  const vendor = await prisma.vendor.create({
    data: {
      name: `E2E Vendor ${suffix}`,
      companyName: `E2E Vendor Company ${suffix}`,
      email: `vendor-${suffix}@example.com`,
      companyId: company.id,
      status: 'VERIFIED',
    },
  })

  const supplier = await prisma.vendorSupplier.create({
    data: {
      vendorId: vendor.id,
      name: `E2E Subtier ${suffix}`,
    },
  })

  const contractNumber = `E2E-PO-${suffix}`
  const contract = await prisma.vendorContract.create({
    data: {
      contractNumber,
      vendorId: vendor.id,
      companyId: company.id,
      type: 'LUMP_SUM',
      totalSum: 100_000,
      estimateAmount: 100_000,
      retentionPercent: 10,
      warrantyYears: 1,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
    },
  })

  await prisma.projectContract.create({
    data: {
      contractId: contract.id,
      projectId: project.id,
      allocatedAmount: 100_000,
    },
  })

  await prisma.contractSupplier.create({
    data: {
      contractId: contract.id,
      vendorSupplierId: supplier.id,
    },
  })

  const approvedLienRelease = await prisma.lienRelease.create({
    data: {
      companyId: company.id,
      vendorId: vendor.id,
      contractId: contract.id,
      projectId: project.id,
      vendorSupplierId: supplier.id,
      type: 'CONDITIONAL_PROGRESS',
      status: 'APPROVED',
      title: 'E2E Conditional April Release',
      amount: 45_000,
      throughDate: new Date('2026-04-30T00:00:00.000Z'),
      effectiveDate: new Date('2026-05-02T00:00:00.000Z'),
      externalPaymentRef: 'E2E-PAY-001',
      externalSource: 'Playwright',
      requestedAt: new Date('2026-05-01T00:00:00.000Z'),
      requestedById: user.id,
      reviewedAt: new Date('2026-05-02T00:00:00.000Z'),
      reviewedById: user.id,
      approvedAt: new Date('2026-05-02T00:00:00.000Z'),
      approvedById: user.id,
    },
  })

  const pendingLienRelease = await prisma.lienRelease.create({
    data: {
      companyId: company.id,
      vendorId: vendor.id,
      contractId: contract.id,
      projectId: project.id,
      vendorSupplierId: supplier.id,
      type: 'UNCONDITIONAL_PROGRESS',
      status: 'UNDER_REVIEW',
      title: 'E2E Unconditional April Release',
      amount: 45_000,
      throughDate: new Date('2026-04-30T00:00:00.000Z'),
      effectiveDate: new Date('2026-05-05T00:00:00.000Z'),
      externalPaymentRef: 'E2E-PAY-001',
      externalSource: 'Playwright',
      requestedAt: new Date('2026-05-01T00:00:00.000Z'),
      requestedById: user.id,
      reviewedAt: new Date('2026-05-05T00:00:00.000Z'),
      reviewedById: user.id,
    },
  })

  const payment = await prisma.contractPayment.create({
    data: {
      contractId: contract.id,
      createdById: user.id,
      amount: 45_000,
      paymentDate: new Date('2026-05-01T00:00:00.000Z'),
      billingPeriodDate: new Date('2026-04-30T00:00:00.000Z'),
      reference: 'E2E-PAY-001',
      submittedBy: 'E2E AP',
      amountComplete: 50_000,
      lessRetention: 5_000,
      subtotal: 45_000,
      currentBilling: 45_000,
      amountRequesting: 45_000,
      acaAmountRequesting: 45_000,
      amountApproved: 45_000,
      currentRetention: 5_000,
      expectedLienReleaseCount: 2,
      pmStatus: 'APPROVED',
      apStatus: 'WAITING_ON_LIEN_RELEASES',
      lienReleaseLinks: {
        create: [
          { lienReleaseId: approvedLienRelease.id },
          { lienReleaseId: pendingLienRelease.id },
        ],
      },
    },
  })

  return {
    companyId: company.id,
    user: {
      id: user.id,
      email: user.email,
      password,
    },
    projectId: project.id,
    vendorId: vendor.id,
    contractId: contract.id,
    paymentId: payment.id,
    costCodeId: costCode.id,
    approvedLienReleaseId: approvedLienRelease.id,
    pendingLienReleaseId: pendingLienRelease.id,
    contractNumber,
  }
}

export async function deleteFixtureCompany(companyId: string) {
  await prisma.$transaction([
    prisma.workOrderAttachment.deleteMany({
      where: { workOrder: { companyId } },
    }),
    prisma.workOrderComment.deleteMany({
      where: { workOrder: { companyId } },
    }),
    prisma.workOrderIssue.deleteMany({
      where: { workOrder: { companyId } },
    }),
    prisma.workOrder.deleteMany({
      where: { companyId },
    }),
    prisma.assetIssueComment.deleteMany({
      where: { issue: { asset: { companyId } } },
    }),
    prisma.assetIssue.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetInspection.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetJobAssignment.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetMeterReading.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetCustomFieldValue.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetCustomFieldDefinition.deleteMany({
      where: { companyId },
    }),
    prisma.assetRentalRate.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.maintenanceRecord.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.maintenanceSchedule.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetRequest.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.assetAttachment.deleteMany({
      where: { asset: { companyId } },
    }),
    prisma.asset.deleteMany({
      where: { companyId },
    }),
    prisma.assetStatusDefinition.deleteMany({
      where: { companyId },
    }),
    prisma.assetIssueNotificationSetting.deleteMany({
      where: { companyId },
    }),
    prisma.contractPaymentLienRelease.deleteMany({
      where: { payment: { contract: { companyId } } },
    }),
    prisma.contractPaymentCostAllocation.deleteMany({
      where: { payment: { contract: { companyId } } },
    }),
    prisma.contractPaymentAttachment.deleteMany({
      where: { payment: { contract: { companyId } } },
    }),
    prisma.contractPayment.deleteMany({
      where: { contract: { companyId } },
    }),
    prisma.costCode.deleteMany({
      where: { companyId },
    }),
    prisma.lienReleaseDocument.deleteMany({
      where: { lienRelease: { companyId } },
    }),
    prisma.lienReleaseEvent.deleteMany({
      where: { lienRelease: { companyId } },
    }),
    prisma.lienRelease.deleteMany({
      where: { companyId },
    }),
    prisma.contractSupplier.deleteMany({
      where: { contract: { companyId } },
    }),
    prisma.projectContract.deleteMany({
      where: { contract: { companyId } },
    }),
    prisma.vendorContract.deleteMany({
      where: { companyId },
    }),
    prisma.vendorSupplier.deleteMany({
      where: { vendor: { companyId } },
    }),
    prisma.vendor.deleteMany({
      where: { companyId },
    }),
    prisma.notification.deleteMany({
      where: { user: { companyId } },
    }),
    prisma.activity.deleteMany({
      where: { user: { companyId } },
    }),
    prisma.card.deleteMany({
      where: { companyId },
    }),
    prisma.stage.deleteMany({
      where: { companyId },
    }),
    prisma.user.deleteMany({
      where: { companyId },
    }),
    prisma.company.deleteMany({
      where: { id: companyId },
    }),
  ]).catch(() => undefined)
}

export async function closePrisma() {
  await prisma.$disconnect()
}
