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
    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${c.bg} ${c.text}`}>
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Contract Not Found</h2>
        <p className="text-gray-600 mb-4">The requested contract could not be found.</p>
        <Link
          href={`/dashboard/vendors/${vendorId}`}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/vendors/${vendorId}?tab=contracts`}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Contract Details</h1>
              {getContractStatusBadge(contract.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">{contract.contractNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
            {getContractTypeLabel(contract.type)}
          </span>
        </div>
      </div>

      {/* Vendor Info Card */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium text-gray-900">{contract.vendor.companyName}</p>
            </div>
          </div>
          <Link
            href={`/dashboard/vendors/${vendorId}`}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View Vendor <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Contract Summary */}
      <ContractSummaryCard contractId={contract.id} />

      {/* Retention Info */}
      {contract.retentionPercent && contract.retentionPercent > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Retention Holdback</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-amber-900">
            {contract.retentionPercent}%
            {contract.retentionAmount && (
              <span className="text-amber-700 ml-2">
                ({formatCurrency(contract.retentionAmount)})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Line Items */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="p-6">
          <ContractLineItems contractId={contract.id} />
        </div>
      </div>

      {/* Change Orders */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
        </div>
        <div className="p-6">
          <ContractChangeOrders contractId={contract.id} />
        </div>
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dates & Duration */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            Contract Duration
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Start Date</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(contract.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">End Date</span>
              <span className="text-sm font-medium text-gray-900">
                {contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : <span className="text-gray-400 italic">Not specified</span>}
              </span>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <span className="text-sm text-gray-500">Warranty Period</span>
              <span className="text-sm font-medium text-gray-900">
                {contract.warrantyYears} year{contract.warrantyYears > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Associated Projects</h3>
          {contract.projects.length === 0 ? (
            <p className="text-sm text-gray-500">No projects associated with this contract</p>
          ) : (
            <div className="space-y-2">
              {contract.projects.map(({ project }) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="text-sm font-medium text-gray-900">{project.title}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
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
      </div>

      {/* Terms & Notes */}
      {(contract.terms || contract.notes) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contract.terms && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.terms}</p>
            </div>
          )}
          {contract.notes && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-gray-400" />
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
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50"
            >
              {isUploadingDocument ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </div>
        <div className="p-6">
          {(!contract.documents || contract.documents.length === 0) ? (
            <div className="text-center py-8">
              <Paperclip className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No documents uploaded</p>
              <p className="text-xs text-gray-400">Upload contracts, agreements, or other files</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contract.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="h-6 w-6 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)} - {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-primary-600 rounded"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this document?')) {
                          deleteDocumentMutation.mutate({ documentId: doc.id })
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
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
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            Payments
          </h2>
          <button
            type="button"
            onClick={() => setIsAddPaymentModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </button>
        </div>
        <div className="p-6">
          {/* Payment Progress */}
          {contract.payments && contract.payments.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contract Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(contract.totalSum)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-right">
                {Math.round(paidPercentage)}% paid
              </p>
            </div>
          )}

          {(!contract.payments || contract.payments.length === 0) ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No payments recorded</p>
              <p className="text-xs text-gray-400">Track payments made for this contract</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contract.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      {payment.reference && (
                        <span className="text-sm text-gray-500">Ref: {payment.reference}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-400">
                        by {payment.createdBy.firstName} {payment.createdBy.lastName}
                      </p>
                    </div>
                    {payment.notes && (
                      <p className="text-sm text-gray-600 mt-2">{payment.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-400">
        Created on {new Date(contract.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Payment</h3>
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
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddPayment()
              }}
              className="p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Remaining: {formatCurrency(remaining)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={paymentForm.paymentDate}
                    onChange={(date) => setPaymentForm({ ...paymentForm, paymentDate: date })}
                    placeholder="Select payment date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Invoice #, Check #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional notes about this payment"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPaymentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
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
