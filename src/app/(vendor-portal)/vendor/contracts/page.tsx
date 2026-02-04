'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVendorAuthStore } from '@/store/vendor-auth'
import { useVendorCurrency } from '@/hooks/useVendorCurrency'
import { FileText, Calendar, DollarSign, Building, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'

async function fetchContracts(token: string) {
  const response = await fetch('/api/vendor-portal/contracts', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch contracts')
  return response.json()
}

interface Payment {
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

interface Contract {
  id: string
  contractNumber: string
  type: string
  totalSum: number
  retentionPercent: number
  retentionAmount?: number
  warrantyYears: number
  startDate: string
  endDate: string
  status: string
  terms?: string
  createdAt: string
  projects?: Array<{
    allocatedAmount?: number
    project: {
      id: string
      title: string
      status: string
    }
  }>
  payments?: Payment[]
}

export default function VendorContractsPage() {
  const { token } = useVendorAuthStore()
  const { format: formatCurrency } = useVendorCurrency()
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set())

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ['vendor-contracts'],
    queryFn: () => fetchContracts(token!),
    enabled: !!token,
  })

  const toggleContract = (contractId: string) => {
    setExpandedContracts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contractId)) {
        newSet.delete(contractId)
      } else {
        newSet.add(contractId)
      }
      return newSet
    })
  }

  const getTotalPaid = (payments?: Payment[]) => {
    if (!payments || payments.length === 0) return 0
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      case 'DRAFT': return 'bg-gray-100 text-gray-700'
      case 'COMPLETED': return 'bg-blue-100 text-blue-700'
      case 'TERMINATED': return 'bg-red-100 text-red-700'
      case 'EXPIRED': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'LUMP_SUM': return 'Lump Sum'
      case 'REMEASURABLE': return 'Remeasurable'
      case 'ADDENDUM': return 'Addendum'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : contracts?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No contracts yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts?.map((contract) => {
            const totalPaid = getTotalPaid(contract.payments)
            const remaining = contract.totalSum - totalPaid
            const percentPaid = contract.totalSum > 0 ? (totalPaid / contract.totalSum) * 100 : 0
            const isExpanded = expandedContracts.has(contract.id)

            return (
              <div key={contract.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{contract.contractNumber}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                          {contract.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{getTypeLabel(contract.type)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(contract.totalSum)}</p>
                      {contract.retentionPercent > 0 && (
                        <p className="text-sm text-gray-500">
                          Retention: {contract.retentionPercent}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Progress Section */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Contract Total</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(contract.totalSum)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Remaining</p>
                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(remaining)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-right">
                      {Math.round(percentPaid)}% paid
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Start Date</p>
                        <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">End Date</p>
                        <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Warranty</p>
                        <p className="font-medium">{contract.warrantyYears} year(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Projects</p>
                        <p className="font-medium">{contract.projects?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {contract.projects && contract.projects.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Linked Projects</p>
                      <div className="flex flex-wrap gap-2">
                        {contract.projects.map((pc) => (
                          <span
                            key={pc.project.id}
                            className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                          >
                            {pc.project.title}
                            {pc.allocatedAmount && (
                              <span className="text-gray-400 ml-1">
                                ({formatCurrency(pc.allocatedAmount)})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {contract.terms && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Terms</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{contract.terms}</p>
                    </div>
                  )}
                </div>

                {/* Payments Section - Expandable */}
                <div className="border-t">
                  <button
                    onClick={() => toggleContract(contract.id)}
                    className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Payment History ({contract.payments?.length || 0})
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50">
                      {!contract.payments || contract.payments.length === 0 ? (
                        <div className="text-center py-4">
                          <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No payments recorded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contract.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  {payment.reference && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      Ref: {payment.reference}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <p className="text-xs text-gray-500">
                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    by {payment.createdBy.firstName} {payment.createdBy.lastName}
                                  </p>
                                </div>
                                {payment.notes && (
                                  <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
