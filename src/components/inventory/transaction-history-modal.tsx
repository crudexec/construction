'use client'

import { useQuery } from '@tanstack/react-query'
import { X, ArrowUpCircle, ArrowDownCircle, Package } from 'lucide-react'
import { format } from 'date-fns'

interface Material {
  id: string
  name: string
  sku: string | null
  unit: string
  quantity: number
}

interface Transaction {
  id: string
  type: 'STOCK_IN' | 'STOCK_OUT'
  quantity: number
  previousQty: number
  newQty: number
  reason: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
  project: {
    id: string
    title: string
  } | null
}

interface TransactionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  material: Material
}

async function fetchTransactions(materialId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/inventory/${materialId}/transactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch transactions')
  return response.json()
}

export function TransactionHistoryModal({ isOpen, onClose, material }: TransactionHistoryModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', material.id],
    queryFn: () => fetchTransactions(material.id),
    enabled: isOpen
  })

  if (!isOpen) return null

  const transactions: Transaction[] = data?.transactions || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
            <p className="text-sm text-gray-500">{material.name} {material.sku ? `(${material.sku})` : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Package className="h-12 w-12 mb-4 text-gray-300" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm">Stock movements will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`border rounded-lg p-4 ${
                    tx.type === 'STOCK_IN' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {tx.type === 'STOCK_IN' ? (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ArrowUpCircle className="h-5 w-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 rounded-lg">
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {tx.type === 'STOCK_IN' ? 'Stock In' : 'Stock Out'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'STOCK_IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'STOCK_IN' ? '+' : '-'}{tx.quantity} {material.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.previousQty} → {tx.newQty} {material.unit}
                      </p>
                    </div>
                  </div>

                  {(tx.reason || tx.project) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {tx.reason && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Reason:</span> {tx.reason}
                        </p>
                      )}
                      {tx.project && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Project:</span> {tx.project.title}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    by {tx.user.firstName} {tx.user.lastName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Stock:</span>
            <span className="font-bold text-gray-900">{material.quantity} {material.unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
