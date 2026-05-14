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
  amountRequesting?: number | null
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
}

export interface ComputedContractPayment extends ContractPaymentLike {
  originalContractAmount: number
  modifications: number
  revisedContract: number
  previouslyBilledApproved: number
  previouslyWithheldRetention: number
  currentBilling: number
  paidToDate: number
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
  let runningRetentionWithheld = 0

  const computed = sortedPayments.map<ComputedContractPayment>((payment) => {
    const previouslyBilledApproved = roundCurrency(runningApprovedPaid)
    const previouslyWithheldRetention = roundCurrency(runningRetentionWithheld)
    const computedSubtotal = roundCurrency(
      (payment.amountComplete ?? 0) - (payment.lessRetention ?? payment.currentRetention ?? 0)
    )
    const subtotal = payment.subtotal ?? computedSubtotal
    const currentBilling = roundCurrency(payment.currentBilling ?? (subtotal - previouslyBilledApproved))
    const basePaidToDate = roundCurrency(previouslyBilledApproved + subtotal)
    const paidToDate = roundCurrency(
      payment.paidToDateOverride ?? (basePaidToDate + (payment.paidToDateAdjustment ?? 0))
    )
    const lienReleaseUploadedCount = getLienReleaseUploadedCount(payment.attachments)
    const expectedLienReleaseCount = payment.expectedLienReleaseCount ?? 0

    const computedPayment: ComputedContractPayment = {
      ...payment,
      originalContractAmount,
      modifications,
      revisedContract,
      previouslyBilledApproved,
      previouslyWithheldRetention,
      currentBilling,
      paidToDate,
      lienReleaseUploadedCount,
      lienReleaseDisplay: expectedLienReleaseCount > 0
        ? `${lienReleaseUploadedCount}/${expectedLienReleaseCount}`
        : `${lienReleaseUploadedCount}`,
      isLocked: isContractPaymentLocked(payment),
    }

    if (payment.apStatus === 'PAID') {
      runningApprovedPaid += payment.amountApproved ?? payment.amount ?? 0
      runningRetentionWithheld += payment.currentRetention ?? 0
    }

    return computedPayment
  })

  return computed.sort((a, b) => {
    const paymentDateDiff = toTime(b.paymentDate) - toTime(a.paymentDate)
    if (paymentDateDiff !== 0) return paymentDateDiff
    return toTime(b.createdAt) - toTime(a.createdAt)
  })
}
