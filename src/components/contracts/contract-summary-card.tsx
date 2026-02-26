'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, TrendingDown, Minus, AlertCircle, FileText } from 'lucide-react'

interface ContractSummaryCardProps {
  contractId: string
}

export function ContractSummaryCard({ contractId }: ContractSummaryCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contract-summary', contractId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}/summary`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch contract summary')
      return response.json()
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <AlertCircle className="h-6 w-6 mx-auto text-red-400 mb-2" />
        <p className="text-sm text-red-600">Failed to load summary</p>
      </div>
    )
  }

  const financials = data?.financials || {}
  const changeOrders = data?.changeOrders || { byStatus: {}, totalCount: 0 }

  const percentChange = financials.percentChangeFromOriginal || 0
  const hasChange = Math.abs(percentChange) > 0.01

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Contract Value Summary
      </h4>

      {/* Main Value Display */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Original Contract</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(financials.originalContractValue || 0)}
          </p>
        </div>
        <div className="text-center border-l border-r border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Approved COs</p>
          <p className={`text-lg font-semibold ${(financials.approvedChangeOrdersTotal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(financials.approvedChangeOrdersTotal || 0) >= 0 ? '+' : ''}{formatCurrency(financials.approvedChangeOrdersTotal || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Current Value</p>
          <p className="text-lg font-bold text-primary-700">
            {formatCurrency(financials.currentContractValue || 0)}
          </p>
        </div>
      </div>

      {/* Change Indicator */}
      {hasChange && (
        <div className={`flex items-center justify-center gap-2 py-2 rounded ${
          percentChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {percentChange > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {formatPercent(percentChange)} from original
          </span>
          <span className="text-sm">
            ({formatCurrency(financials.netChangeFromOriginal || 0)})
          </span>
        </div>
      )}

      {/* Pending COs Warning */}
      {(financials.pendingChangeOrdersTotal || 0) > 0 && (
        <div className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded text-yellow-700 text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pending change orders
          </span>
          <span className="font-medium">
            +{formatCurrency(financials.pendingChangeOrdersTotal || 0)}
          </span>
        </div>
      )}

      {/* Potential Value */}
      {(financials.pendingChangeOrdersTotal || 0) > 0 && (
        <div className="text-center text-sm text-gray-500">
          Potential value (if pending approved):{' '}
          <span className="font-medium text-gray-700">
            {formatCurrency(financials.potentialContractValue || 0)}
          </span>
        </div>
      )}

      {/* Change Order Summary */}
      {changeOrders.totalCount > 0 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {changeOrders.totalCount} change order{changeOrders.totalCount !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-3">
              {changeOrders.byStatus.draft?.count > 0 && (
                <span>Draft: {changeOrders.byStatus.draft.count}</span>
              )}
              {changeOrders.byStatus.pending?.count > 0 && (
                <span className="text-yellow-600">Pending: {changeOrders.byStatus.pending.count}</span>
              )}
              {changeOrders.byStatus.approved?.count > 0 && (
                <span className="text-green-600">Approved: {changeOrders.byStatus.approved.count}</span>
              )}
              {changeOrders.byStatus.rejected?.count > 0 && (
                <span className="text-red-600">Rejected: {changeOrders.byStatus.rejected.count}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
