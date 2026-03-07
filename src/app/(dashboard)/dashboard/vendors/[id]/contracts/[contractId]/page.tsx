'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Plus,
  AlertCircle,
  Building2,
  Shield,
  Edit,
  ExternalLink
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { ContractLineItems } from '@/components/contracts/contract-line-items'
import { ContractChangeOrders } from '@/components/contracts/contract-change-orders'
import { ContractSummaryCard } from '@/components/contracts/contract-summary-card'

interface ContractDocument {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  createdAt: string
}

interface ContractPayment {
  id: string
  amount: number
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
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
    'DRAFT': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'ACTIVE': { bg: 'bg-green-100', text: 'text-green-800' },
    'COMPLETED': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'TERMINATED': { bg: 'bg-red-100', text: 'text-red-800' },
    'EXPIRED': { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  }
  const c = config[status] || config['DRAFT']
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${c.bg} ${c.text}`}>
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
  const queryClient = useQueryClient()
  const contractId = params.contractId as string
  const vendorId = params.id as string
  const { symbol: currencySymbol, format: formatCurrency } = useCurrency()

  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
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

  const addPaymentMutation = useMutation({
    mutationFn: async ({ paymentData }: { paymentData: any }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add payment')
      }
      return response.json()
    },
    onSuccess: () => {
      refetch()
      setIsAddPaymentModalOpen(false)
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      })
    }
  })

  const handleAddPayment = () => {
    if (!paymentForm.amount) return

    addPaymentMutation.mutate({
      paymentData: {
        amount: parseFloat(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined
      }
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

  const totalPaid = contract.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remaining = contract.totalSum - totalPaid
  const paidPercentage = contract.totalSum > 0 ? (totalPaid / contract.totalSum) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/vendors/${vendorId}?tab=contracts`}
            className="p-1.5 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Contract Details</h1>
              {getContractStatusBadge(contract.status)}
              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {getContractTypeLabel(contract.type)}
              </span>
            </div>
            <p className="text-xs text-gray-500">{contract.contractNumber}</p>
          </div>
        </div>
      </div>

      {/* Top Row: Vendor + Retention */}
      <div className="flex gap-3">
        {/* Vendor Info Card */}
        <div className="bg-white rounded-lg border p-3 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="text-sm font-medium text-gray-900">{contract.vendor.companyName}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/vendors/${vendorId}`}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Retention Info */}
        {contract.retentionPercent && contract.retentionPercent > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">Retention</span>
            </div>
            <p className="text-sm font-semibold text-amber-900">
              {contract.retentionPercent}%
              {contract.retentionAmount && (
                <span className="text-amber-700 ml-1 text-xs">
                  ({formatCurrency(contract.retentionAmount)})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Contract Summary */}
      <ContractSummaryCard contractId={contract.id} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Line Items */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
          </div>
          <div className="p-3">
            <ContractLineItems contractId={contract.id} />
          </div>
        </div>

        {/* Change Orders */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Change Orders</h2>
          </div>
          <div className="p-3">
            <ContractChangeOrders contractId={contract.id} />
          </div>
        </div>
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Dates & Duration */}
        <div className="bg-white rounded-lg border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            Duration
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Start</span>
              <span className="font-medium text-gray-900">
                {new Date(contract.startDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">End</span>
              <span className="font-medium text-gray-900">
                {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : <span className="text-gray-400 italic">TBD</span>}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t">
              <span className="text-gray-500">Warranty</span>
              <span className="font-medium text-gray-900">
                {contract.warrantyYears} yr{contract.warrantyYears > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Projects</h3>
          {contract.projects.length === 0 ? (
            <p className="text-xs text-gray-500">No projects linked</p>
          ) : (
            <div className="space-y-1">
              {contract.projects.map(({ project }) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 text-xs"
                >
                  <span className="font-medium text-gray-900 truncate">{project.title}</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${
                    project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Terms & Notes Combined */}
        <div className="bg-white rounded-lg border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Notes</h3>
          {!contract.terms && !contract.notes ? (
            <p className="text-xs text-gray-500">No terms or notes</p>
          ) : (
            <div className="space-y-2 text-xs">
              {contract.terms && (
                <div>
                  <p className="text-gray-500 mb-0.5">Terms</p>
                  <p className="text-gray-700 line-clamp-3">{contract.terms}</p>
                </div>
              )}
              {contract.notes && (
                <div>
                  <p className="text-gray-500 mb-0.5">Notes</p>
                  <p className="text-gray-700 line-clamp-3">{contract.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Documents & Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Documents Section */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-gray-400" />
              Documents
            </h2>
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
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 disabled:opacity-50"
              >
                {isUploadingDocument ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-primary-600 border-t-transparent rounded-full mr-1" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-3">
            {(!contract.documents || contract.documents.length === 0) ? (
              <div className="text-center py-4">
                <Paperclip className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                <p className="text-xs text-gray-500">No documents</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {contract.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-gray-500">
                          {formatFileSize(doc.fileSize)} - {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-primary-600 rounded"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this document?')) {
                            deleteDocumentMutation.mutate({ documentId: doc.id })
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payments Section */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400" />
              Payments
            </h2>
            <button
              type="button"
              onClick={() => setIsAddPaymentModalOpen(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </button>
          </div>
          <div className="p-3">
            {/* Payment Progress */}
            {contract.payments && contract.payments.length > 0 && (
              <div className="bg-blue-50 rounded p-3 mb-3">
                <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.totalSum)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Paid</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(remaining)}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1 text-right">{Math.round(paidPercentage)}% paid</p>
              </div>
            )}

            {(!contract.payments || contract.payments.length === 0) ? (
              <div className="text-center py-4">
                <DollarSign className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                <p className="text-xs text-gray-500">No payments</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {contract.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                      {payment.reference && <span>Ref: {payment.reference}</span>}
                      <span>by {payment.createdBy.firstName} {payment.createdBy.lastName}</span>
                    </div>
                    {payment.notes && (
                      <p className="text-[10px] text-gray-600 mt-1">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400">
        Created {new Date(contract.createdAt).toLocaleDateString()}
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Add Payment</h3>
              <button
                onClick={() => {
                  setIsAddPaymentModalOpen(false)
                  setPaymentForm({
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    reference: '',
                    notes: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddPayment()
              }}
              className="p-4"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Remaining: {formatCurrency(remaining)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={paymentForm.paymentDate}
                    onChange={(date) => setPaymentForm({ ...paymentForm, paymentDate: date })}
                    placeholder="Select date"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Invoice #, Check #"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPaymentMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {addPaymentMutation.isPending ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
