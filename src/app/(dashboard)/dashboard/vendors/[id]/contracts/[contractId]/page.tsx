'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Shield
} from 'lucide-react'
import { ContractLineItems } from '@/components/contracts/contract-line-items'
import { ContractChangeOrders } from '@/components/contracts/contract-change-orders'
import { ContractSummaryCard } from '@/components/contracts/contract-summary-card'
import { ContractLienReleases } from '@/components/contracts/contract-lien-releases'
import { ContractPayments } from '@/components/contracts/contract-payments'

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

interface VendorContract {
  id: string
  contractNumber: string
  type: 'LUMP_SUM' | 'REMEASURABLE' | 'ADDENDUM'
  totalSum: number
  retentionPercent?: number
  retentionAmount?: number
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
    }
  }[]
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
  const router = useRouter()
  const contractId = params.contractId as string
  const vendorId = params.id as string
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
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
          {contract.retentionPercent && contract.retentionPercent > 0 && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" />
              {contract.retentionPercent}% retention
            </span>
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

        {/* Projects */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700">Projects</h3>
          </div>
          {contract.projects.length === 0 ? (
            <div className="px-3 py-3 text-center text-[10px] text-gray-500">No projects linked</div>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {contract.projects.map(({ project }, idx) => (
                  <tr
                    key={project.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <td className="px-3 py-1.5 font-medium text-gray-900 truncate">{project.title}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Terms & Notes Combined */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700">Terms & Notes</h3>
          </div>
          {!contract.terms && !contract.notes ? (
            <div className="px-3 py-3 text-center text-[10px] text-gray-500">No terms or notes</div>
          ) : (
            <div className="px-3 py-2 space-y-2 text-xs">
              {contract.terms && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Terms</p>
                  <p className="text-gray-700 line-clamp-2">{contract.terms}</p>
                </div>
              )}
              {contract.notes && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Notes</p>
                  <p className="text-gray-700 line-clamp-2">{contract.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
      />

      {/* Footer */}
      <div className="text-[10px] text-gray-400 mt-1">
        Created {new Date(contract.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
