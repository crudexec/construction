'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Plus,
  AlertCircle,
  Building2,
  Shield
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { ContractLineItems } from '@/components/contracts/contract-line-items'
import { ContractChangeOrders } from '@/components/contracts/contract-change-orders'
import { ContractSummaryCard } from '@/components/contracts/contract-summary-card'
import { ContractLienReleases } from '@/components/contracts/contract-lien-releases'

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

      {/* Documents & Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Documents Section */}
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

        {/* Payments Section */}
        <div className="bg-white rounded border overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-700">Payments</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddPaymentModalOpen(true)}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* Payment Progress */}
          {contract.payments && contract.payments.length > 0 && (
            <div className="px-3 py-2 border-b bg-blue-50/50">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-gray-600">Total: <span className="font-semibold text-gray-900">{formatCurrency(contract.totalSum)}</span></span>
                <span className="text-gray-600">Paid: <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span></span>
                <span className="text-gray-600">Remaining: <span className="font-semibold text-blue-600">{formatCurrency(remaining)}</span></span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-green-600 h-1 rounded-full transition-all duration-300" style={{ width: `${Math.min(paidPercentage, 100)}%` }} />
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5 text-right">{Math.round(paidPercentage)}% paid</p>
            </div>
          )}

          {(!contract.payments || contract.payments.length === 0) ? (
            <div className="px-3 py-4 text-center text-[10px] text-gray-500">No payments</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">Amount</th>
                  <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">Reference</th>
                  <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">By</th>
                </tr>
              </thead>
              <tbody>
                {contract.payments.map((payment, idx) => (
                  <tr key={payment.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-1.5 font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-1.5 text-gray-600">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="px-3 py-1.5 text-gray-600">{payment.reference || '-'}</td>
                    <td className="px-3 py-1.5 text-gray-500 text-[10px]">{payment.createdBy.firstName} {payment.createdBy.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
