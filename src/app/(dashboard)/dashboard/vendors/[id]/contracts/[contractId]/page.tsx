'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import { ContractLienReleases } from '@/components/contracts/contract-lien-releases'
import { ContractPayments } from '@/components/contracts/contract-payments'
import { ContractSuppliers } from '@/components/contracts/contract-suppliers'

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
  amountRequesting?: number | null
  currentRetention?: number | null
  paidToDateOverride?: number | null
  paidToDateAdjustment?: number | null
  maxPayment?: number | null
  amountApproved?: number | null
  pmStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  apStatus: 'PROCESSING' | 'WAITING_ON_LIEN_RELEASES' | 'PAID'
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
  const params = useParams()
  const contractId = params.contractId as string
  const vendorId = params.id as string
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showTermsFlyout, setShowTermsFlyout] = useState(false)
  const [editForm, setEditForm] = useState({
    retentionPercent: '0',
    retentionBond: '',
    terms: '',
    notes: ''
  })
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
    mutationFn: async (data: { retentionPercent: number; retentionBond: string; terms: string; notes: string }) => {
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
      setIsEditing(false)
      setShowTermsFlyout(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  useEffect(() => {
    if (!contract) return
    setEditForm({
      retentionPercent: String(contract.retentionPercent ?? 0),
      retentionBond: contract.retentionBond || '',
      terms: contract.terms || '',
      notes: contract.notes || ''
    })
  }, [contract])

  const handleStartEdit = () => setIsEditing(true)

  const handleCancelEdit = () => {
    if (contract) {
      setEditForm({
        retentionPercent: String(contract.retentionPercent ?? 0),
        retentionBond: contract.retentionBond || '',
        terms: contract.terms || '',
        notes: contract.notes || ''
      })
    }
    setIsEditing(false)
    setShowTermsFlyout(false)
  }

  const handleSaveEdit = () => {
    const parsedRetention = Number(editForm.retentionPercent)
    if (!Number.isFinite(parsedRetention) || parsedRetention < 0 || parsedRetention > 100) {
      toast.error('Retention percentage must be between 0 and 100')
      return
    }

    updateContractMutation.mutate({
      retentionPercent: parsedRetention,
      retentionBond: editForm.retentionBond,
      terms: editForm.terms,
      notes: editForm.notes
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
      <div className="flex items-center justify-between bg-white border rounded px-3 py-2">
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
        <div className="flex items-center gap-3 text-xs">
          <Link
            href={`/dashboard/vendors/${vendorId}`}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{contract.vendor.companyName}</span>
          </Link>
          {contract.projects[0] && (
            <Link
              href={`/dashboard/projects/${contract.projects[0].project.id}`}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>
                {contract.projects[0].project.title}
                {contract.projects[0].project.projectNumber ? ` (#${contract.projects[0].project.projectNumber})` : ''}
                {contract.projects.length > 1 ? ` +${contract.projects.length - 1} more` : ''}
              </span>
            </Link>
          )}
          {!isEditing && contract.retentionPercent && contract.retentionPercent > 0 && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" />
              {contract.retentionPercent}% retention
            </span>
          )}
          {isEditing && (
            <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Retention %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editForm.retentionPercent}
                onChange={(e) => setEditForm({ ...editForm, retentionPercent: e.target.value })}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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
              Edit
            </button>
          )}
        </div>
      </div>

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
                  {new Date(contract.startDate).toLocaleDateString()}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5 text-gray-500 bg-gray-50/50">End</td>
                <td className="px-3 py-1.5 font-medium text-gray-900">
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : <span className="text-gray-400 italic">TBD</span>}
                </td>
              </tr>
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

      <ContractLienReleases
        contractId={contract.id}
        projects={contract.projects.map(({ project }) => ({
          id: project.id,
          title: project.title,
          status: project.status
        }))}
        suppliers={contract.contractSuppliers.map(({ supplier }) => ({
          id: supplier.id,
          name: supplier.name
        }))}
      />

      {/* Footer */}
      <div className="text-[10px] text-gray-400 mt-1">
        Created {new Date(contract.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
