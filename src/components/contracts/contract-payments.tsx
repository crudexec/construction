'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ContractPaymentAPStatus, ContractPaymentPMStatus } from '@prisma/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, DollarSign, Paperclip, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  computeContractPayments,
  type ComputedContractPayment,
  type ContractPaymentAttachmentLike,
  type ContractPaymentLike,
} from '@/lib/contracts/payment-calculations'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

type AttachmentKind = 'CONDITIONAL_LIEN_RELEASE' | 'UNCONDITIONAL_LIEN_RELEASE' | 'GENERAL_ATTACHMENT'

interface PaymentRow extends ContractPaymentLike {
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  attachments: ContractPaymentAttachmentLike[]
}

interface ChangeOrderSummary {
  id: string
  totalAmount: number
  status: string
}

interface ContractPaymentsProps {
  contractId: string
  contractTotal: number
  retentionPercent?: number | null
  payments: PaymentRow[]
  changeOrders: ChangeOrderSummary[]
  onRefresh: () => Promise<unknown>
}

interface PaymentFormValues {
  submittedBy: string
  paymentDate: string
  billingPeriodDate: string
  clientName: string
  amountComplete: string
  lessRetention: string
  subtotal: string
  currentBilling: string
  earlyPayDiscount: string
  amountRequesting: string
  currentRetention: string
  paidToDateOverride: string
  paidToDateAdjustment: string
  maxPayment: string
  amountApproved: string
  pmStatus: ContractPaymentPMStatus
  apStatus: ContractPaymentAPStatus
  conditionalAmount: string
  unconditionalAmount: string
  expectedLienReleaseCount: string
  reference: string
  notes: string
}

const DEFAULT_PM_STATUS: ContractPaymentPMStatus = 'PENDING'
const DEFAULT_AP_STATUS: ContractPaymentAPStatus = 'PROCESSING'

const PM_STATUS_OPTIONS: ContractPaymentPMStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
const AP_STATUS_OPTIONS: ContractPaymentAPStatus[] = ['PROCESSING', 'WAITING_ON_LIEN_RELEASES', 'PAID']

const LIEN_ATTACHMENT_LABELS: Record<AttachmentKind, string> = {
  CONDITIONAL_LIEN_RELEASE: 'Conditional Lien Release',
  UNCONDITIONAL_LIEN_RELEASE: 'Unconditional Lien Release',
  GENERAL_ATTACHMENT: 'Attachment',
}

const CURRENCY_FIELDS = new Set<keyof PaymentFormValues>([
  'amountComplete',
  'lessRetention',
  'subtotal',
  'currentBilling',
  'earlyPayDiscount',
  'amountRequesting',
  'currentRetention',
  'paidToDateOverride',
  'paidToDateAdjustment',
  'maxPayment',
  'amountApproved',
  'conditionalAmount',
  'unconditionalAmount',
])

function formatDate(value?: string | Date | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseCurrencyInput(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function currencyToInput(value?: number | null) {
  return value === null || value === undefined ? '' : String(value)
}

export function ContractPayments({
  contractId,
  contractTotal,
  retentionPercent,
  payments,
  changeOrders,
  onRefresh,
}: ContractPaymentsProps) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const approvedChangeOrderTotal = useMemo(
    () => changeOrders
      .filter((changeOrder) => changeOrder.status === 'APPROVED')
      .reduce((sum, changeOrder) => sum + changeOrder.totalAmount, 0),
    [changeOrders]
  )
  const computedPayments = useMemo(
    () => computeContractPayments(payments, contractTotal, approvedChangeOrderTotal),
    [payments, contractTotal, approvedChangeOrderTotal]
  )

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>(() => buildEmptyForm())
  const [manualFormulaFields, setManualFormulaFields] = useState<Set<string>>(new Set())
  const [attachmentTarget, setAttachmentTarget] = useState<{ paymentId: string; kind: AttachmentKind } | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const selectedPayment = computedPayments.find((payment) => payment.id === selectedPaymentId) || null

  const refreshAll = async () => {
    await onRefresh()
    queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
  }

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment row')
      }

      return response.json()
    },
    onSuccess: async () => {
      toast.success('Payment row created')
      await refreshAll()
      closeModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ paymentId, payload }: { paymentId: string; payload: Record<string, unknown> }) => {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment row')
      }

      return response.json()
    },
    onSuccess: async () => {
      toast.success('Payment row updated')
      await refreshAll()
      closeModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete payment row')
      }
    },
    onSuccess: async () => {
      toast.success('Payment row deleted')
      await refreshAll()
      closeModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({
      paymentId,
      file,
      kind,
    }: {
      paymentId: string
      file: File
      kind: AttachmentKind
    }) => {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', kind)

      const response = await fetch(`/api/contracts/${contractId}/payments/${paymentId}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload attachment')
      }

      return response.json()
    },
    onSuccess: async () => {
      toast.success('Attachment uploaded')
      setAttachmentTarget(null)
      await refreshAll()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ paymentId, attachmentId }: { paymentId: string; attachmentId: string }) => {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(
        `/api/contracts/${contractId}/payments/${paymentId}/attachments?attachmentId=${attachmentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete attachment')
      }
    },
    onSuccess: async () => {
      toast.success('Attachment deleted')
      await refreshAll()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const totalPaid = computedPayments
    .filter((payment) => payment.apStatus === 'PAID')
    .reduce((sum, payment) => sum + (payment.amountApproved ?? payment.amount ?? 0), 0)
  const revisedContract = roundCurrency(contractTotal + approvedChangeOrderTotal)
  const remaining = revisedContract - totalPaid
  const paidPercentage = revisedContract > 0 ? (totalPaid / revisedContract) * 100 : 0

  useEffect(() => {
    if (!isModalOpen) return

    const preview = getPreviewPayment(paymentForm, manualFormulaFields, {
      contractTotal,
      retentionPercent: retentionPercent ?? 0,
      approvedChangeOrderTotal,
      payments,
      selectedPaymentId,
    })

    setPaymentForm((current) => {
      const next = { ...current }
      let changed = false

      const assignIfNeeded = (key: keyof PaymentFormValues, value: string) => {
        if (next[key] !== value) {
          next[key] = value as never
          changed = true
        }
      }

      if (!manualFormulaFields.has('lessRetention')) assignIfNeeded('lessRetention', currencyToInput(preview.lessRetention))
      if (!manualFormulaFields.has('subtotal')) assignIfNeeded('subtotal', currencyToInput(preview.subtotal))
      if (!manualFormulaFields.has('currentBilling')) assignIfNeeded('currentBilling', currencyToInput(preview.currentBilling))
      if (!manualFormulaFields.has('amountRequesting')) assignIfNeeded('amountRequesting', currencyToInput(preview.amountRequesting))
      if (!manualFormulaFields.has('currentRetention')) assignIfNeeded('currentRetention', currencyToInput(preview.currentRetention))
      if (!manualFormulaFields.has('maxPayment') && !current.maxPayment) assignIfNeeded('maxPayment', currencyToInput(preview.currentBilling))
      if (!manualFormulaFields.has('amountApproved') && !current.amountApproved) assignIfNeeded('amountApproved', currencyToInput(preview.amountRequesting))

      return changed ? next : current
    })
  }, [
    isModalOpen,
    paymentForm,
    manualFormulaFields,
    contractTotal,
    retentionPercent,
    approvedChangeOrderTotal,
    payments,
    selectedPaymentId,
  ])

  const openCreateModal = () => {
    setSelectedPaymentId(null)
    setManualFormulaFields(new Set())
    setPaymentForm(buildEmptyForm())
    setIsModalOpen(true)
  }

  const openEditModal = (payment: ComputedContractPayment) => {
    setSelectedPaymentId(payment.id)
    setManualFormulaFields(new Set(['lessRetention', 'subtotal', 'currentBilling', 'amountRequesting', 'currentRetention', 'maxPayment', 'amountApproved']))
    setPaymentForm({
      submittedBy: payment.submittedBy || '',
      paymentDate: toInputDate(payment.paymentDate),
      billingPeriodDate: toInputDate(payment.billingPeriodDate) || toInputDate(payment.paymentDate),
      clientName: payment.clientName || '',
      amountComplete: currencyToInput(payment.amountComplete),
      lessRetention: currencyToInput(payment.lessRetention),
      subtotal: currencyToInput(payment.subtotal),
      currentBilling: currencyToInput(payment.currentBilling),
      earlyPayDiscount: currencyToInput(payment.earlyPayDiscount),
      amountRequesting: currencyToInput(payment.amountRequesting),
      currentRetention: currencyToInput(payment.currentRetention),
      paidToDateOverride: currencyToInput(payment.paidToDateOverride),
      paidToDateAdjustment: currencyToInput(payment.paidToDateAdjustment),
      maxPayment: currencyToInput(payment.maxPayment),
      amountApproved: currencyToInput(payment.amountApproved),
      pmStatus: payment.pmStatus,
      apStatus: payment.apStatus,
      conditionalAmount: currencyToInput(payment.conditionalAmount),
      unconditionalAmount: currencyToInput(payment.unconditionalAmount),
      expectedLienReleaseCount: String(payment.expectedLienReleaseCount ?? 0),
      reference: payment.reference || '',
      notes: payment.notes || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPaymentId(null)
    setPaymentForm(buildEmptyForm())
    setManualFormulaFields(new Set())
  }

  const handleCurrencyChange = (field: keyof PaymentFormValues, value: string) => {
    if (CURRENCY_FIELDS.has(field)) {
      setManualFormulaFields((prev) => {
        const next = new Set(prev)
        if (['lessRetention', 'subtotal', 'currentBilling', 'amountRequesting', 'currentRetention', 'maxPayment', 'amountApproved', 'conditionalAmount', 'unconditionalAmount'].includes(field)) {
          next.add(field)
        }
        return next
      })
    }

    setPaymentForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = () => {
    const payload = buildPayload(paymentForm)
    if (!payload.paymentDate) {
      toast.error('Submitted date is required')
      return
    }

    if (selectedPaymentId) {
      updateMutation.mutate({ paymentId: selectedPaymentId, payload })
      return
    }

    createMutation.mutate(payload)
  }

  const previewPayment = getPreviewPayment(paymentForm, manualFormulaFields, {
    contractTotal,
    retentionPercent: retentionPercent ?? 0,
    approvedChangeOrderTotal,
    payments,
    selectedPaymentId,
  })

  return (
    <>
      <div className="bg-white rounded border overflow-hidden">
        <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-700">Payments</h2>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        <div className="px-3 py-2 border-b bg-blue-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
            <div>
              <p className="text-gray-500 uppercase">Original Contract</p>
              <p className="font-semibold text-gray-900">{formatCurrency(contractTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase">Approved Mods</p>
              <p className="font-semibold text-gray-900">{formatCurrency(approvedChangeOrderTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase">Revised Contract</p>
              <p className="font-semibold text-gray-900">{formatCurrency(revisedContract)}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase">Paid to Date</p>
              <p className="font-semibold text-green-700">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-gray-600">Remaining: <span className="font-semibold text-blue-700">{formatCurrency(remaining)}</span></span>
            <span className="text-gray-500">{Math.round(paidPercentage)}% paid</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
            <div className="bg-green-600 h-1 rounded-full transition-all duration-300" style={{ width: `${Math.min(paidPercentage, 100)}%` }} />
          </div>
        </div>

        {computedPayments.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-500">No payment rows yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2100px] text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <HeaderCell>Submitted By</HeaderCell>
                  <HeaderCell>Submitted</HeaderCell>
                  <HeaderCell>Month</HeaderCell>
                  <HeaderCell>Original Contract</HeaderCell>
                  <HeaderCell>Modifications</HeaderCell>
                  <HeaderCell>Revised Contract</HeaderCell>
                  <HeaderCell>Amount Complete</HeaderCell>
                  <HeaderCell>Less Retention</HeaderCell>
                  <HeaderCell>Subtotal</HeaderCell>
                  <HeaderCell>Previously Billed Approved</HeaderCell>
                  <HeaderCell>Current Billing</HeaderCell>
                  <HeaderCell>Early Pay Discount</HeaderCell>
                  <HeaderCell>Amount Requesting</HeaderCell>
                  <HeaderCell>Current Retention</HeaderCell>
                  <HeaderCell>Paid to Date</HeaderCell>
                  <HeaderCell>Max Payment</HeaderCell>
                  <HeaderCell>Amount Approved</HeaderCell>
                  <HeaderCell>PM Status</HeaderCell>
                  <HeaderCell>AP Status</HeaderCell>
                  <HeaderCell>Conditional</HeaderCell>
                  <HeaderCell>Unconditional</HeaderCell>
                  <HeaderCell>Lien Releases</HeaderCell>
                  <HeaderCell>Attachments</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {computedPayments.map((payment, index) => (
                  <tr key={payment.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <BodyCell>{payment.submittedBy || '-'}</BodyCell>
                    <BodyCell>{formatDate(payment.paymentDate)}</BodyCell>
                    <BodyCell>{formatDate(payment.billingPeriodDate)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.originalContractAmount)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.modifications)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.revisedContract)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.amountComplete ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.lessRetention ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.subtotal ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.previouslyBilledApproved)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.currentBilling)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.earlyPayDiscount ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.amountRequesting ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.currentRetention ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.paidToDate)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.maxPayment ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.amountApproved ?? 0)}</BodyCell>
                    <BodyCell><StatusBadge value={payment.pmStatus} /></BodyCell>
                    <BodyCell><StatusBadge value={payment.apStatus} /></BodyCell>
                    <BodyCell>{formatCurrency(payment.conditionalAmount ?? 0)}</BodyCell>
                    <BodyCell>{formatCurrency(payment.unconditionalAmount ?? 0)}</BodyCell>
                    <BodyCell>{payment.lienReleaseDisplay}</BodyCell>
                    <BodyCell>{payment.attachments?.length ?? 0}</BodyCell>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(payment)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                          title="Edit payment row"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!payment.isLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this payment row?')) {
                                deleteMutation.mutate(payment.id)
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="Delete payment row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[92vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{selectedPaymentId ? 'Edit Payment Row' : 'Add Payment Row'}</h3>
                <p className="text-[11px] text-gray-500">Billing row for a subcontractor pay application.</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &times;
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-132px)] p-4 space-y-4">
              {selectedPayment && selectedPayment.isLocked && (
                <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  This row is read-only because PM status is Approved and AP status is Paid.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <FormField label="Submitted By">
                  <input
                    type="text"
                    value={paymentForm.submittedBy}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, submittedBy: event.target.value }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Submitted Date">
                  <DatePicker
                    value={paymentForm.paymentDate}
                    onChange={(value) => setPaymentForm((current) => ({ ...current, paymentDate: value }))}
                    placeholder="Select submit date"
                    disabled={selectedPayment?.isLocked}
                  />
                </FormField>
                <FormField label="Month">
                  <DatePicker
                    value={paymentForm.billingPeriodDate}
                    onChange={(value) => setPaymentForm((current) => ({ ...current, billingPeriodDate: value }))}
                    placeholder="Select month date"
                    disabled={selectedPayment?.isLocked}
                  />
                </FormField>
                <FormField label="Client">
                  <input
                    type="text"
                    value={paymentForm.clientName}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, clientName: event.target.value }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SummaryCard label="Original Contract" value={formatCurrency(previewPayment.originalContractAmount)} />
                <SummaryCard label="Modifications" value={formatCurrency(previewPayment.modifications)} />
                <SummaryCard label="Revised Contract" value={formatCurrency(previewPayment.revisedContract)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <CurrencyInputField
                  label="Amount Complete"
                  value={paymentForm.amountComplete}
                  onChange={(value) => handleCurrencyChange('amountComplete', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Less Retention"
                  value={paymentForm.lessRetention}
                  onChange={(value) => handleCurrencyChange('lessRetention', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Subtotal"
                  value={paymentForm.subtotal}
                  onChange={(value) => handleCurrencyChange('subtotal', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <SummaryCard label="Previously Billed Approved" value={formatCurrency(previewPayment.previouslyBilledApproved)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <CurrencyInputField
                  label="Current Billing"
                  value={paymentForm.currentBilling}
                  onChange={(value) => handleCurrencyChange('currentBilling', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Early Pay Discount"
                  value={paymentForm.earlyPayDiscount}
                  onChange={(value) => handleCurrencyChange('earlyPayDiscount', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Amount Requesting"
                  value={paymentForm.amountRequesting}
                  onChange={(value) => handleCurrencyChange('amountRequesting', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Current Retention"
                  value={paymentForm.currentRetention}
                  onChange={(value) => handleCurrencyChange('currentRetention', value)}
                  disabled={selectedPayment?.isLocked}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <SummaryCard label="Paid to Date Preview" value={formatCurrency(previewPayment.paidToDate)} />
                <CurrencyInputField
                  label="Paid to Date Override"
                  value={paymentForm.paidToDateOverride}
                  onChange={(value) => handleCurrencyChange('paidToDateOverride', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Paid to Date Adjustment"
                  value={paymentForm.paidToDateAdjustment}
                  onChange={(value) => handleCurrencyChange('paidToDateAdjustment', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Max Payment"
                  value={paymentForm.maxPayment}
                  onChange={(value) => handleCurrencyChange('maxPayment', value)}
                  disabled={selectedPayment?.isLocked}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <CurrencyInputField
                  label="Amount Approved"
                  value={paymentForm.amountApproved}
                  onChange={(value) => handleCurrencyChange('amountApproved', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Conditional"
                  value={paymentForm.conditionalAmount}
                  onChange={(value) => handleCurrencyChange('conditionalAmount', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <CurrencyInputField
                  label="Unconditional"
                  value={paymentForm.unconditionalAmount}
                  onChange={(value) => handleCurrencyChange('unconditionalAmount', value)}
                  disabled={selectedPayment?.isLocked}
                />
                <FormField label="Expected Lien Releases">
                  <input
                    type="number"
                    min="0"
                    value={paymentForm.expectedLienReleaseCount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, expectedLienReleaseCount: event.target.value }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <FormField label="PM Status">
                  <select
                    value={paymentForm.pmStatus}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, pmStatus: event.target.value as ContractPaymentPMStatus }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                  >
                    {PM_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="AP Status">
                  <select
                    value={paymentForm.apStatus}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, apStatus: event.target.value as ContractPaymentAPStatus }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                  >
                    {AP_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Reference">
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                    disabled={selectedPayment?.isLocked}
                    className={inputClassName}
                    placeholder="Invoice or check reference"
                  />
                </FormField>
                <SummaryCard label="Lien Releases Uploaded" value={previewPayment.lienReleaseDisplay} />
              </div>

              <FormField label="Notes">
                <textarea
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                  disabled={selectedPayment?.isLocked}
                  rows={3}
                  className={inputClassName}
                />
              </FormField>

              {selectedPayment && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['CONDITIONAL_LIEN_RELEASE', 'UNCONDITIONAL_LIEN_RELEASE', 'GENERAL_ATTACHMENT'] as AttachmentKind[]).map((kind) => (
                    <div key={kind} className="rounded border border-gray-200">
                      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 text-gray-500" />
                          <p className="text-xs font-medium text-gray-700">{LIEN_ATTACHMENT_LABELS[kind]}</p>
                        </div>
                        {!selectedPayment.isLocked && (
                          <button
                            type="button"
                            onClick={() => setAttachmentTarget({ paymentId: selectedPayment.id, kind })}
                            className="text-[10px] text-primary-600 hover:text-primary-800"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2 space-y-2 text-xs">
                        {(selectedPayment.attachments ?? []).filter((attachment) => attachment.kind === kind).length === 0 ? (
                          <p className="text-gray-500">No files uploaded</p>
                        ) : (
                          (selectedPayment.attachments ?? [])
                            .filter((attachment) => attachment.kind === kind)
                            .map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1.5">
                                <button
                                  type="button"
                                  onClick={() => window.open(attachment.url, '_blank')}
                                  className="truncate text-left text-primary-700 hover:underline"
                                >
                                  {attachment.originalName}
                                </button>
                                {!selectedPayment.isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => deleteAttachmentMutation.mutate({ paymentId: selectedPayment.id, attachmentId: attachment.id })}
                                    className="text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Previously billed and paid-to-date values recalculate from older paid rows.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                {!selectedPayment?.isLocked && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                  >
                    {selectedPaymentId ? (updateMutation.isPending ? 'Saving...' : 'Save Changes') : (createMutation.isPending ? 'Creating...' : 'Create Row')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {attachmentTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Upload {LIEN_ATTACHMENT_LABELS[attachmentTarget.kind]}</h3>
                <p className="text-[11px] text-gray-500">Attach files to this payment row.</p>
              </div>
              <button onClick={() => setAttachmentTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-4">
              <input
                ref={attachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  uploadMutation.mutate({
                    paymentId: attachmentTarget.paymentId,
                    file,
                    kind: attachmentTarget.kind,
                  })
                  if (attachmentInputRef.current) attachmentInputRef.current.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700"
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? 'Uploading...' : 'Choose file'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600 whitespace-nowrap">{children}</th>
}

function BodyCell({ children }: { children: ReactNode }) {
  return <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{children}</td>
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'APPROVED' || value === 'PAID'
    ? 'bg-green-100 text-green-700'
    : value === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : value === 'WAITING_ON_LIEN_RELEASES'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${tone}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function CurrencyInputField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <FormField label={label}>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClassName}
      />
    </FormField>
  )
}

function buildEmptyForm(): PaymentFormValues {
  const today = new Date().toISOString().split('T')[0]
  return {
    submittedBy: '',
    paymentDate: today,
    billingPeriodDate: today,
    clientName: '',
    amountComplete: '',
    lessRetention: '',
    subtotal: '',
    currentBilling: '',
    earlyPayDiscount: '',
    amountRequesting: '',
    currentRetention: '',
    paidToDateOverride: '',
    paidToDateAdjustment: '',
    maxPayment: '',
    amountApproved: '',
    pmStatus: DEFAULT_PM_STATUS,
    apStatus: DEFAULT_AP_STATUS,
    conditionalAmount: '',
    unconditionalAmount: '',
    expectedLienReleaseCount: '0',
    reference: '',
    notes: '',
  }
}

function buildPayload(form: PaymentFormValues) {
  return {
    submittedBy: form.submittedBy || undefined,
    paymentDate: form.paymentDate || undefined,
    billingPeriodDate: form.billingPeriodDate || undefined,
    clientName: form.clientName || undefined,
    amountComplete: parseCurrencyInput(form.amountComplete),
    lessRetention: parseCurrencyInput(form.lessRetention),
    subtotal: parseCurrencyInput(form.subtotal),
    currentBilling: parseCurrencyInput(form.currentBilling),
    earlyPayDiscount: parseCurrencyInput(form.earlyPayDiscount),
    amountRequesting: parseCurrencyInput(form.amountRequesting),
    currentRetention: parseCurrencyInput(form.currentRetention),
    paidToDateOverride: parseCurrencyInput(form.paidToDateOverride),
    paidToDateAdjustment: parseCurrencyInput(form.paidToDateAdjustment),
    maxPayment: parseCurrencyInput(form.maxPayment),
    amountApproved: parseCurrencyInput(form.amountApproved),
    pmStatus: form.pmStatus,
    apStatus: form.apStatus,
    conditionalAmount: parseCurrencyInput(form.conditionalAmount),
    unconditionalAmount: parseCurrencyInput(form.unconditionalAmount),
    expectedLienReleaseCount: Number(form.expectedLienReleaseCount || 0),
    reference: form.reference || undefined,
    notes: form.notes || undefined,
  }
}

function getPreviewPayment(
  form: PaymentFormValues,
  manualFormulaFields: Set<string>,
  context: {
    contractTotal: number
    retentionPercent: number
    approvedChangeOrderTotal: number
    payments: PaymentRow[]
    selectedPaymentId: string | null
  }
) {
  const amountComplete = parseCurrencyInput(form.amountComplete) ?? 0
  const retentionValue = roundCurrency(amountComplete * (context.retentionPercent || 0) / 100)
  const lessRetention = manualFormulaFields.has('lessRetention')
    ? parseCurrencyInput(form.lessRetention) ?? retentionValue
    : retentionValue
  const subtotal = manualFormulaFields.has('subtotal')
    ? parseCurrencyInput(form.subtotal) ?? roundCurrency(amountComplete - lessRetention)
    : roundCurrency(amountComplete - lessRetention)
  const temporaryCurrentBilling = manualFormulaFields.has('currentBilling')
    ? parseCurrencyInput(form.currentBilling)
    : undefined
  const currentRetention = manualFormulaFields.has('currentRetention')
    ? parseCurrencyInput(form.currentRetention) ?? retentionValue
    : retentionValue

  const draftPayment: PaymentRow = {
    id: context.selectedPaymentId || 'draft-payment-row',
    amount: parseCurrencyInput(form.amountApproved) ?? parseCurrencyInput(form.amountRequesting) ?? 0,
    paymentDate: form.paymentDate,
    createdAt: new Date().toISOString(),
    submittedBy: form.submittedBy || null,
    billingPeriodDate: form.billingPeriodDate || null,
    clientName: form.clientName || null,
    reference: form.reference || null,
    notes: form.notes || null,
    amountComplete,
    lessRetention,
    subtotal,
    currentBilling: temporaryCurrentBilling ?? null,
    earlyPayDiscount: parseCurrencyInput(form.earlyPayDiscount) ?? 0,
    amountRequesting: parseCurrencyInput(form.amountRequesting) ?? null,
    currentRetention,
    paidToDateOverride: parseCurrencyInput(form.paidToDateOverride) ?? null,
    paidToDateAdjustment: parseCurrencyInput(form.paidToDateAdjustment) ?? null,
    maxPayment: parseCurrencyInput(form.maxPayment) ?? null,
    amountApproved: parseCurrencyInput(form.amountApproved) ?? null,
    pmStatus: form.pmStatus,
    apStatus: form.apStatus,
    conditionalAmount: parseCurrencyInput(form.conditionalAmount) ?? null,
    unconditionalAmount: parseCurrencyInput(form.unconditionalAmount) ?? null,
    expectedLienReleaseCount: Number(form.expectedLienReleaseCount || 0),
    attachments: context.payments.find((payment) => payment.id === context.selectedPaymentId)?.attachments || [],
    createdBy: context.payments.find((payment) => payment.id === context.selectedPaymentId)?.createdBy || {
      id: 'draft',
      firstName: 'Draft',
      lastName: 'Row',
    },
  }

  const paymentRows = context.payments
    .filter((payment) => payment.id !== context.selectedPaymentId)
    .concat(draftPayment)

  const computed = computeContractPayments(paymentRows, context.contractTotal, context.approvedChangeOrderTotal)
  const preview = computed.find((payment) => payment.id === draftPayment.id)!
  const requestedDefault = roundCurrency(preview.currentBilling - (parseCurrencyInput(form.earlyPayDiscount) ?? 0))

  return {
    ...preview,
    lessRetention,
    subtotal,
    amountRequesting: manualFormulaFields.has('amountRequesting')
      ? parseCurrencyInput(form.amountRequesting) ?? requestedDefault
      : requestedDefault,
    currentRetention,
  }
}

function toInputDate(value?: string | Date | null) {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

const inputClassName = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500'
