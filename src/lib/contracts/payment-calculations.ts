import type { ContractPaymentAPStatus, ContractPaymentPMStatus } from '@prisma/client'

export interface ContractPaymentAttachmentLike {
  id: string
  kind: 'CONDITIONAL_LIEN_RELEASE' | 'UNCONDITIONAL_LIEN_RELEASE' | 'GENERAL_ATTACHMENT'
  url: string
  originalName: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string | Date
}

export interface ContractPaymentCostAllocationLike {
  id?: string
  costCodeId: string
  amount: number
  notes?: string | null
  costCode?: {
    id: string
    code: string
    name: string
  } | null
}

export interface ContractPaymentLienReleaseLike {
  id: string
  lienReleaseId: string
  lienRelease: {
    id: string
    type: string
    status: string
    title?: string | null
    amount?: number | null
    throughDate?: string | Date | null
    effectiveDate?: string | Date | null
    externalPaymentRef?: string | null
    supplier?: {
      id: string
      name: string
    } | null
    documents?: Array<{
      id: string
      kind: string
      originalName: string
      createdAt: string | Date
    }>
  }
}

export interface ContractPaymentLike {
  id: string
  amount: number
  paymentDate: string | Date
  createdAt: string | Date
  submittedBy?: string | null
  billingPeriodDate?: string | Date | null
  clientName?: string | null
  reference?: string | null
  notes?: string | null
  amountComplete?: number | null
  lessRetention?: number | null
  subtotal?: number | null
  currentBilling?: number | null
  earlyPayDiscount?: number | null
  earlyPayDiscountPercent?: number | null
  amountRequesting?: number | null
  acaAmountRequesting?: number | null
  hasAcaDiscrepancy?: boolean | null
  acaDiscrepancyNote?: string | null
  currentRetention?: number | null
  paidToDateOverride?: number | null
  paidToDateAdjustment?: number | null
  maxPayment?: number | null
  amountApproved?: number | null
  pmStatus: ContractPaymentPMStatus
  apStatus: ContractPaymentAPStatus
  conditionalAmount?: number | null
  unconditionalAmount?: number | null
  expectedLienReleaseCount?: number | null
  attachments?: ContractPaymentAttachmentLike[]
  costAllocations?: ContractPaymentCostAllocationLike[]
  lienReleaseLinks?: ContractPaymentLienReleaseLike[]
}

export interface ComputedContractPayment extends ContractPaymentLike {
  originalContractAmount: number
  modifications: number
  revisedContract: number
  previouslyBilledApproved: number
  previouslyWithheldRetention: number
  currentBilling: number
  paidToDate: number
  grossPaidToDate: number
  netPaidToDate: number
  currentRetentionHeld: number
  calculatedEarlyPayDiscount: number
  calculatedAcaDiscrepancy: boolean
  linkedLienReleaseCount: number
  approvedLienReleaseCount: number
  lienReleaseComplianceDisplay: string
  lienReleaseUploadedCount: number
  lienReleaseDisplay: string
  isLocked: boolean
}

const toTime = (value?: string | Date | null) => (value ? new Date(value).getTime() : 0)

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function getLienReleaseUploadedCount(attachments: ContractPaymentAttachmentLike[] = []) {
  return attachments.filter((attachment) =>
    attachment.kind === 'CONDITIONAL_LIEN_RELEASE' || attachment.kind === 'UNCONDITIONAL_LIEN_RELEASE'
  ).length
}

export function isContractPaymentLocked(payment: Pick<ContractPaymentLike, 'pmStatus' | 'apStatus'>) {
  return payment.pmStatus === 'APPROVED' && payment.apStatus === 'PAID'
}

export function computeContractPayments(
  payments: ContractPaymentLike[],
  contractValue: number,
  approvedChangeOrderTotal: number,
) {
  const originalContractAmount = roundCurrency(contractValue || 0)
  const modifications = roundCurrency(approvedChangeOrderTotal || 0)
  const revisedContract = roundCurrency(originalContractAmount + modifications)

  const sortedPayments = [...payments].sort((a, b) => {
    const paymentDateDiff = toTime(a.paymentDate) - toTime(b.paymentDate)
    if (paymentDateDiff !== 0) return paymentDateDiff
    return toTime(a.createdAt) - toTime(b.createdAt)
  })

  let runningApprovedPaid = 0
  let runningGrossPaid = 0
  let runningRetentionWithheld = 0

  const computed = sortedPayments.map<ComputedContractPayment>((payment) => {
    const previouslyBilledApproved = roundCurrency(runningApprovedPaid)
    const previouslyWithheldRetention = roundCurrency(runningRetentionWithheld)
    const computedSubtotal = roundCurrency(
      (payment.amountComplete ?? 0) - (payment.lessRetention ?? payment.currentRetention ?? 0)
    )
    const subtotal = payment.subtotal ?? computedSubtotal
    const currentBilling = roundCurrency(payment.currentBilling ?? (subtotal - previouslyBilledApproved))
    const calculatedEarlyPayDiscount = payment.earlyPayDiscount ?? roundCurrency(
      currentBilling * ((payment.earlyPayDiscountPercent ?? 0) / 100)
    )
    const currentPaidAmount = payment.apStatus === 'PAID' ? (payment.amountApproved ?? payment.amount ?? 0) : 0
    const currentGrossPaid = payment.apStatus === 'PAID' ? (payment.amountComplete ?? runningGrossPaid) : runningGrossPaid
    const netPaidToDate = roundCurrency(
      payment.paidToDateOverride ?? (runningApprovedPaid + currentPaidAmount + (payment.paidToDateAdjustment ?? 0))
    )
    const grossPaidToDate = roundCurrency(currentGrossPaid)
    const storedRetention = payment.currentRetention ?? null
    const paidRetentionHeld = storedRetention === null
      ? previouslyWithheldRetention + (payment.lessRetention ?? 0)
      : storedRetention >= previouslyWithheldRetention
        ? storedRetention
        : previouslyWithheldRetention + storedRetention
    const currentRetentionHeld = roundCurrency(
      payment.apStatus === 'PAID' ? paidRetentionHeld : previouslyWithheldRetention
    )
    const calculatedAcaDiscrepancy = payment.amountApproved !== null &&
      payment.amountApproved !== undefined &&
      payment.acaAmountRequesting !== null &&
      payment.acaAmountRequesting !== undefined &&
      Math.abs(roundCurrency(payment.amountApproved) - roundCurrency(payment.acaAmountRequesting)) > 0.009
    const lienReleaseUploadedCount = getLienReleaseUploadedCount(payment.attachments)
    const linkedLienReleaseCount = payment.lienReleaseLinks?.length ?? 0
    const approvedLienReleaseCount = payment.lienReleaseLinks?.filter((link) =>
      link.lienRelease.status === 'APPROVED'
    ).length ?? 0
    const expectedLienReleaseCount = payment.expectedLienReleaseCount ?? 0
    const lienReleaseComplianceDisplay = expectedLienReleaseCount > 0
      ? `${approvedLienReleaseCount}/${expectedLienReleaseCount}`
      : `${approvedLienReleaseCount}/${linkedLienReleaseCount}`

    const computedPayment: ComputedContractPayment = {
      ...payment,
      originalContractAmount,
      modifications,
      revisedContract,
      previouslyBilledApproved,
      previouslyWithheldRetention,
      currentBilling,
      paidToDate: netPaidToDate,
      grossPaidToDate,
      netPaidToDate,
      currentRetentionHeld,
      calculatedEarlyPayDiscount,
      calculatedAcaDiscrepancy,
      linkedLienReleaseCount,
      approvedLienReleaseCount,
      lienReleaseComplianceDisplay,
      lienReleaseUploadedCount,
      lienReleaseDisplay: expectedLienReleaseCount > 0
        ? `${lienReleaseUploadedCount}/${expectedLienReleaseCount}`
        : `${lienReleaseUploadedCount}/${linkedLienReleaseCount}`,
      isLocked: isContractPaymentLocked(payment),
    }

    if (payment.apStatus === 'PAID') {
      runningApprovedPaid += payment.amountApproved ?? payment.amount ?? 0
      runningGrossPaid = payment.amountComplete ?? runningGrossPaid
      runningRetentionWithheld = currentRetentionHeld
    }

    return computedPayment
  })

  return computed.sort((a, b) => {
    const paymentDateDiff = toTime(b.paymentDate) - toTime(a.paymentDate)
    if (paymentDateDiff !== 0) return paymentDateDiff
    return toTime(b.createdAt) - toTime(a.createdAt)
  })
}
