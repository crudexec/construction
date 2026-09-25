'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  FileText,
  Calendar,
  Paperclip,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Building2,
  Shield,
  Briefcase,
  Edit,
  Save,
  X as XIcon,
  ScrollText
} from 'lucide-react'
import { ContractLineItems } from '@/components/contracts/contract-line-items'
import { ContractChangeOrders } from '@/components/contracts/contract-change-orders'
import { ContractSummaryCard } from '@/components/contracts/contract-summary-card'
import { ContractLienReleaseCompliance } from '@/components/contracts/contract-lien-release-compliance'
import { ContractPayments } from '@/components/contracts/contract-payments'
import { ContractSuppliers } from '@/components/contracts/contract-suppliers'

import { ContractDetailsFields, detailsValues, type ContractDetailsValues } from '@/components/contracts/contract-details-fields'
import { contractDate, contractDuration } from '@/lib/contracts/details'

interface ContractDocument {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  createdAt: string
}

interface ContractPaymentAttachment {
  id: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  url: string
  kind: 'CONDITIONAL_LIEN_RELEASE' | 'UNCONDITIONAL_LIEN_RELEASE' | 'GENERAL_ATTACHMENT'
  createdAt: string
}

interface ContractPaymentCostAllocation {
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

interface ContractPaymentLienReleaseLink {
  id: string
  lienReleaseId: string
  lienRelease: ContractLienRelease
}

interface ContractPayment {
  id: string
  amount: number
  paymentDate: string
  reference?: string
  notes?: string
  submittedBy?: string | null
  billingPeriodDate?: string | null
  clientName?: string | null
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
  pmStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  apStatus: 'PROCESSING' | 'WAITING_ON_LIEN_RELEASES' | 'PAID' | 'VOID'
  conditionalAmount?: number | null
  unconditionalAmount?: number | null
  expectedLienReleaseCount?: number | null
  createdAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  attachments: ContractPaymentAttachment[]
  costAllocations?: ContractPaymentCostAllocation[]
  lienReleaseLinks?: ContractPaymentLienReleaseLink[]
}

interface ContractLienRelease {
  id: string
  type: 'CONDITIONAL_PROGRESS' | 'UNCONDITIONAL_PROGRESS' | 'CONDITIONAL_FINAL' | 'UNCONDITIONAL_FINAL'
  status: 'DRAFT' | 'REQUESTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'VOID'
  title?: string | null
  amount?: number | null
  throughDate?: string | null
  effectiveDate?: string | null
  externalPaymentRef?: string | null
  externalSource?: string | null
  supplier?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    title: string
    status: string
  } | null
  documents?: {
    id: string
    kind: string
    originalName: string
    createdAt: string
  }[]
}

interface ContractSupplierLink {
  id: string
  supplier: {
    id: string
    name: string
    phone?: string | null
    notes?: string | null
  }
}

interface VendorContract {
  title?: string | null
  description?: string | null
  estimateReference?: string | null
  originalValueIsManual: boolean
  updatedAt: string
  id: string
  contractNumber: string
  type: 'LUMP_SUM' | 'REMEASURABLE' | 'ADDENDUM'
  totalSum: number
  estimateAmount?: number | null
  retentionPercent?: number
  retentionAmount?: number
  retentionBond?: string | null
  warrantyYears: number
  startDate: string
  endDate?: string | null
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXPIRED'
  terms?: string
  notes?: string
  createdAt: string
  documents?: ContractDocument[]
  payments?: ContractPayment[]
  changeOrders: {
    id: string
    totalAmount: number
    status: string
  }[]
  vendor: {
    id: string
    name: string
    companyName: string
  }
  projects: {
    id: string
    project: {
      id: string
      title: string
      status: string
      projectNumber?: string | null
    }
  }[]
  contractSuppliers: ContractSupplierLink[]
  lienReleases?: ContractLienRelease[]
}

async function fetchContract(contractId: string): Promise<VendorContract> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/contracts/${contractId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch contract')
  return response.json()
}

const getContractStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    'DRAFT': { bg: 'bg-gray-100', text: 'text-gray-700' },
    'ACTIVE': { bg: 'bg-green-100', text: 'text-green-700' },
    'COMPLETED': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'TERMINATED': { bg: 'bg-red-100', text: 'text-red-700' },
    'EXPIRED': { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  }
  const c = config[status] || config['DRAFT']
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

const getContractTypeLabel = (type: string) => {
  switch (type) {
    case 'LUMP_SUM': return 'Lump Sum'
    case 'REMEASURABLE': return 'Remeasurable'
    case 'ADDENDUM': return 'Addendum'
    default: return type
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ContractDetailPage() {
  const queryClient = useQueryClient()
  const params = useParams()
  const contractId = params.contractId as string
  const vendorId = params.id as string
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showTermsFlyout, setShowTermsFlyout] = useState(false)
  const [editForm, setEditForm] = useState<ContractDetailsValues>({
    contractNumber: '', title: '', description: '', estimateReference: '', estimateAmount: '', totalSum: '',
    startDate: '', endDate: '', retentionPercent: '0', retentionBond: '', terms: '', notes: ''
  })
  const editVersion = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: contract, isLoading, error, refetch } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => fetchContract(contractId)
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/contracts/${contractId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload document')
      }
      return response.json()
    },
    onSuccess: () => {
      refetch()
      setIsUploadingDocument(false)
    },
    onError: () => {
      setIsUploadingDocument(false)
    }
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }
      return { documentId }
    },
    onSuccess: () => {
      refetch()
    }
  })

  const updateContractMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update contract')
      }

      return response.json()
    },
    onSuccess: async () => {
      toast.success('Contract updated')
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['contract-summary', contractId] })
      setIsEditing(false)
      setShowTermsFlyout(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  useEffect(() => {
    if (contract && !isEditing) setEditForm(detailsValues(contract))
  }, [contract, isEditing])

  const handleStartEdit = () => {
    if (!contract) return
    setEditForm(detailsValues(contract))
    editVersion.current = contract.updatedAt
    setIsEditing(true)
  }
  const handleCancelEdit = () => {
    if (contract) setEditForm(detailsValues(contract))
    setIsEditing(false)
    setShowTermsFlyout(false)
  }
  const handleSaveEdit = () => {
    if (!contract) return
    const retention = Number(editForm.retentionPercent)
    const original = Number(editForm.totalSum)
    const estimate = editForm.estimateAmount.trim() === '' ? null : Number(editForm.estimateAmount)
    if (!editForm.contractNumber.trim() || !editForm.startDate || editForm.totalSum.trim() === '' || editForm.retentionPercent.trim() === '') {
      toast.error('Contract number, original amount, start date and retention are required')
      return
    }
    if (![retention, original, ...(estimate === null ? [] : [estimate])].every(n => Number.isFinite(n) && n >= 0) || retention > 100) {
      toast.error('Amounts must be nonnegative and retention must be between 0 and 100')
      return
    }
    if (editForm.endDate && editForm.endDate < editForm.startDate) {
      toast.error('End date cannot be before start date')
      return
    }
    updateContractMutation.mutate({
      ...editForm, updatedAt: editVersion.current, retentionPercent: retention,
      totalSum: original !== contract.totalSum ? original : undefined,
      estimateAmount: estimate, endDate: editForm.endDate || null
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploadingDocument(true)
      uploadDocumentMutation.mutate({ file })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-gray-900 mb-1">Contract Not Found</h2>
        <p className="text-sm text-gray-600 mb-3">The requested contract could not be found.</p>
        <Link
          href={`/dashboard/vendors/${vendorId}`}
          className="bg-primary-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-primary-700"
        >
          Back to Vendor
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white border rounded px-3 py-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/vendors/${vendorId}?tab=contracts`}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-900">{contract.contractNumber}</h1>
            {getContractStatusBadge(contract.status)}
            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
              {getContractTypeLabel(contract.type)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href={`/dashboard/vendors/${vendorId}`}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{contract.vendor.companyName}</span>
          </Link>
          {contract.projects.map(({ project }) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}?tab=vendors`} className="flex items-center gap-1 text-primary-700 hover:underline">
              <Briefcase className="h-3.5 w-3.5" />Back to {project.title}
            </Link>
          ))}
          {!isEditing && (contract.retentionPercent ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" />
              {contract.retentionPercent}% retention
            </span>
          )}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
              >
                <XIcon className="h-3 w-3" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateContractMutation.isPending}
                className="inline-flex items-center gap-1 rounded bg-primary-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {updateContractMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-3 w-3" />
              Edit Contract
            </button>
          )}
        </div>
      </div>

      {isEditing && <ContractDetailsFields value={editForm} onChange={setEditForm}
        approvedChanges={contract.changeOrders.filter(co => co.status === 'APPROVED').reduce((sum, co) => sum + co.totalAmount, 0)}
        disabled={updateContractMutation.isPending} />}
      {!isEditing && (contract.title || contract.description || contract.estimateReference) && <section className="bg-white border rounded p-3 text-sm">
        {contract.title && <h2 className="font-semibold">{contract.title}</h2>}
        {contract.description && <p className="whitespace-pre-wrap">{contract.description}</p>}
        {contract.estimateReference && <p className="text-gray-500">Estimate Reference: {contract.estimateReference}</p>}
      </section>}
      {/* Contract Summary */}
      <ContractSummaryCard contractId={contract.id} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Line Items */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-700">Line Items</h2>
          </div>
          <ContractLineItems contractId={contract.id} />
        </div>

        {/* Change Orders */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-700">Change Orders</h2>
          </div>
          <ContractChangeOrders contractId={contract.id} />
        </div>
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Dates & Duration */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <h3 className="text-xs font-semibold text-gray-700">Duration</h3>
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5 text-gray-500 bg-gray-50/50 w-20">Start</td>
                <td className="px-3 py-1.5 font-medium text-gray-900">
                  {contractDate(contract.startDate)}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5 text-gray-500 bg-gray-50/50">End</td>
                <td className="px-3 py-1.5 font-medium text-gray-900">
                  {contract.endDate ? contractDate(contract.endDate) : <span className="text-gray-400 italic">TBD</span>}
                </td>
              </tr>
              <tr><td className="px-3 py-1.5 text-gray-500">Duration</td><td className="px-3 py-1.5">{contractDuration(contract.startDate, contract.endDate) === null ? 'TBD' : `${contractDuration(contract.startDate, contract.endDate)} calendar days`}</td></tr>
              <tr>
                <td className="px-3 py-1.5 text-gray-500 bg-gray-50/50">Warranty</td>
                <td className="px-3 py-1.5 font-medium text-gray-900">
                  {contract.warrantyYears} yr{contract.warrantyYears > 1 ? 's' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Subtiers / Suppliers — feeds Lien Releases */}
        <ContractSuppliers
          contractId={contract.id}
          vendorId={vendorId}
          suppliers={contract.contractSuppliers}
          onRefresh={refetch}
        />

        {/* Retention Bond + Terms & Conditions (optional, low priority at this stage) */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">Retention Bond</h3>
            <button
              type="button"
              onClick={() => setShowTermsFlyout(true)}
              className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:text-primary-800"
            >
              <ScrollText className="h-3 w-3" />
              Terms & Conditions
            </button>
          </div>
          <div className="px-3 py-2 text-xs">
            {isEditing ? (
              <textarea
                value={editForm.retentionBond}
                onChange={(e) => setEditForm({ ...editForm, retentionBond: e.target.value })}
                rows={3}
                placeholder="Retention bond details (optional)"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            ) : contract.retentionBond ? (
              <p className="text-gray-700 line-clamp-3">{contract.retentionBond}</p>
            ) : (
              <p className="text-[10px] text-gray-400">No retention bond on file</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded border overflow-hidden">
        <div className="px-3 py-1.5 border-b bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700">Notes</h3>
        </div>
        <div className="px-3 py-2 text-xs">
          {isEditing ? (
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3}
              placeholder="Internal notes (optional)"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          ) : contract.notes ? (
            <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
          ) : (
            <p className="text-[10px] text-gray-400 text-center py-2">No notes</p>
          )}
        </div>
      </div>

      {/* Terms & Conditions flyout */}
      {showTermsFlyout && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowTermsFlyout(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <ScrollText className="h-4 w-4 text-gray-500" />
                Terms & Conditions
              </h3>
              <button onClick={() => setShowTermsFlyout(false)} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[10px] text-gray-400 mb-2">Optional — not required at this stage.</p>
              {isEditing ? (
                <textarea
                  value={editForm.terms}
                  onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                  rows={16}
                  placeholder="Terms & conditions (optional)"
                  className="w-full h-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : contract.terms ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.terms}</p>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No terms & conditions on file</p>
              )}
            </div>
            {isEditing && (
              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTermsFlyout(false)}
                  className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateContractMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateContractMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded border overflow-hidden">
        <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5 text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-700">Documents</h2>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDocument}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800 disabled:opacity-50"
            >
              {isUploadingDocument ? (
                <>
                  <div className="animate-spin h-2.5 w-2.5 border border-primary-600 border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
        {(!contract.documents || contract.documents.length === 0) ? (
          <div className="px-3 py-4 text-center text-[10px] text-gray-500">No documents</div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {contract.documents.map((doc, idx) => (
                <tr
                  key={doc.id}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate max-w-[150px]">{doc.fileName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-[10px] text-gray-500 text-right w-16">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-3 py-1.5 text-[10px] text-gray-500 text-right w-20">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="px-2 py-1.5 text-right w-16">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank') }}
                        className="p-0.5 text-gray-400 hover:text-primary-600"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this document?')) deleteDocumentMutation.mutate({ documentId: doc.id }) }}
                        className="p-0.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ContractPayments
        contractId={contract.id}
        contractTotal={contract.totalSum}
        retentionPercent={contract.retentionPercent}
        vendor={contract.vendor}
        contractNumber={contract.contractNumber}
        payments={contract.payments || []}
        changeOrders={contract.changeOrders || []}
        onRefresh={refetch}
      />

      <ContractLienReleaseCompliance
        contractNumber={contract.contractNumber}
        vendorName={contract.vendor.companyName || contract.vendor.name}
        projects={contract.projects.map(({ project }) => ({
          id: project.id,
          title: project.title,
          status: project.status,
          projectNumber: project.projectNumber,
        }))}
        suppliers={contract.contractSuppliers}
        payments={contract.payments || []}
        lienReleases={contract.lienReleases || []}
      />

      {/* Footer */}
      <div className="text-[10px] text-gray-400 mt-1">
        Created {new Date(contract.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
