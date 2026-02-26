'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Edit, Save, X, FileText,
  ChevronDown, ChevronRight, Clock, Check,
  XCircle, Send, AlertCircle
} from 'lucide-react'

interface ChangeOrderLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string | null
  order: number
}

interface ChangeOrder {
  id: string
  changeOrderNumber: number
  title: string
  description?: string | null
  reason?: string | null
  totalAmount: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  submittedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  lineItems: ChangeOrderLineItem[]
  createdBy?: { id: string; firstName: string; lastName: string }
  approvedBy?: { id: string; firstName: string; lastName: string } | null
  rejectedBy?: { id: string; firstName: string; lastName: string } | null
}

interface ContractChangeOrdersProps {
  contractId: string
  readonly?: boolean
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Edit },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: Check },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const UNIT_OPTIONS = [
  { value: 'EA', label: 'Each' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'HR', label: 'Hour' },
  { value: 'DAY', label: 'Day' },
  { value: 'LS', label: 'Lump Sum' },
  { value: 'CY', label: 'Cubic Yard' },
  { value: 'TON', label: 'Ton' },
  { value: 'GAL', label: 'Gallon' },
  { value: '%', label: 'Percent' },
]

export function ContractChangeOrders({ contractId, readonly = false }: ContractChangeOrdersProps) {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newCO, setNewCO] = useState({
    title: '',
    description: '',
    reason: '',
    lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' }]
  })

  const { data, isLoading } = useQuery({
    queryKey: ['contract-change-orders', contractId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}/change-orders`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch change orders')
      return response.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (coData: typeof newCO) => {
      const response = await fetch(`/api/contracts/${contractId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(coData)
      })
      if (!response.ok) throw new Error('Failed to create change order')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] })
      setIsCreating(false)
      setNewCO({
        title: '',
        description: '',
        reason: '',
        lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' }]
      })
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const response = await fetch(`/api/contracts/${contractId}/change-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, rejectionReason })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/contracts/${contractId}/change-orders/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] })
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const changeOrders: ChangeOrder[] = data?.changeOrders || []
  const approvedTotal = data?.approvedTotal || 0
  const pendingTotal = data?.pendingTotal || 0

  const addLineItem = () => {
    setNewCO({
      ...newCO,
      lineItems: [...newCO.lineItems, { description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' }]
    })
  }

  const removeLineItem = (index: number) => {
    setNewCO({
      ...newCO,
      lineItems: newCO.lineItems.filter((_, i) => i !== index)
    })
  }

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...newCO.lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setNewCO({ ...newCO, lineItems: updated })
  }

  const calculateTotal = () => {
    return newCO.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Change Orders
        </h4>
        {!readonly && (
          <button
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Change Order
          </button>
        )}
      </div>

      {/* Summary */}
      {changeOrders.length > 0 && (
        <div className="flex gap-4 text-xs">
          <div className="bg-green-50 px-3 py-2 rounded">
            <span className="text-green-700">Approved: </span>
            <span className="font-semibold text-green-900">{formatCurrency(approvedTotal)}</span>
          </div>
          <div className="bg-yellow-50 px-3 py-2 rounded">
            <span className="text-yellow-700">Pending: </span>
            <span className="font-semibold text-yellow-900">{formatCurrency(pendingTotal)}</span>
          </div>
        </div>
      )}

      {/* Create New CO Form */}
      {isCreating && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h5 className="font-medium text-gray-900 mb-4">New Change Order</h5>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newCO.title}
                onChange={(e) => setNewCO({ ...newCO, title: e.target.value })}
                placeholder="e.g., Add electrical outlets to Room 202"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCO.description}
                  onChange={(e) => setNewCO({ ...newCO, description: e.target.value })}
                  placeholder="Details of the change..."
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={newCO.reason}
                  onChange={(e) => setNewCO({ ...newCO, reason: e.target.value })}
                  placeholder="Why this change is needed..."
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Line Items</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {newCO.lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start bg-white p-2 rounded border">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-20 border rounded px-2 py-1 text-sm text-right"
                      step="0.01"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-24 border rounded px-2 py-1 text-sm text-right"
                      step="0.01"
                      placeholder="Unit Price"
                    />
                    <span className="w-24 text-right text-sm py-1">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    {newCO.lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 text-sm font-medium">
                Total: {formatCurrency(calculateTotal())}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewCO({
                    title: '',
                    description: '',
                    reason: '',
                    lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' }]
                  })
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(newCO)}
                disabled={createMutation.isPending || !newCO.title}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Change Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Orders List */}
      {changeOrders.length === 0 && !isCreating ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No change orders</p>
          {!readonly && (
            <p className="text-xs text-gray-400">Create change orders to track scope modifications</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {changeOrders.map((co) => {
            const isExpanded = expandedId === co.id
            const StatusIcon = STATUS_CONFIG[co.status].icon

            return (
              <div key={co.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : co.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">CO #{co.changeOrderNumber}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[co.status].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[co.status].label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{co.title}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${co.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {co.totalAmount >= 0 ? '+' : ''}{formatCurrency(co.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(co.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    {co.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700">{co.description}</p>
                      </div>
                    )}
                    {co.reason && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Reason</p>
                        <p className="text-sm text-gray-700">{co.reason}</p>
                      </div>
                    )}

                    {/* Line Items Table */}
                    {co.lineItems.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Line Items</p>
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs text-gray-500">Description</th>
                              <th className="px-2 py-1 text-right text-xs text-gray-500">Qty</th>
                              <th className="px-2 py-1 text-left text-xs text-gray-500">Unit</th>
                              <th className="px-2 py-1 text-right text-xs text-gray-500">Unit Price</th>
                              <th className="px-2 py-1 text-right text-xs text-gray-500">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {co.lineItems.map((item) => (
                              <tr key={item.id}>
                                <td className="px-2 py-1">{item.description}</td>
                                <td className="px-2 py-1 text-right">{item.quantity}</td>
                                <td className="px-2 py-1">{item.unit}</td>
                                <td className="px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-2 py-1 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Status Info */}
                    {co.status === 'APPROVED' && co.approvedBy && (
                      <div className="text-xs text-green-600">
                        Approved by {co.approvedBy.firstName} {co.approvedBy.lastName} on{' '}
                        {co.approvedAt ? new Date(co.approvedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    )}
                    {co.status === 'REJECTED' && (
                      <div className="bg-red-50 p-2 rounded text-xs">
                        <span className="text-red-600">
                          Rejected by {co.rejectedBy?.firstName} {co.rejectedBy?.lastName}
                        </span>
                        {co.rejectionReason && (
                          <p className="text-red-700 mt-1">{co.rejectionReason}</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {!readonly && (
                      <div className="flex gap-2 pt-2 border-t">
                        {co.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateStatusMutation.mutate({ id: co.id, status: 'PENDING_APPROVAL' })
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Submit for Approval
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this change order?')) {
                                  deleteMutation.mutate(co.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                        {co.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateStatusMutation.mutate({ id: co.id, status: 'APPROVED' })
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const reason = prompt('Reason for rejection:')
                                if (reason !== null) {
                                  updateStatusMutation.mutate({ id: co.id, status: 'REJECTED', rejectionReason: reason })
                                }
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateStatusMutation.mutate({ id: co.id, status: 'DRAFT' })
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
                            >
                              Return to Draft
                            </button>
                          </>
                        )}
                        {co.status === 'REJECTED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateStatusMutation.mutate({ id: co.id, status: 'DRAFT' })
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            Revise (Return to Draft)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
