'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Edit, Save, X, FileText,
  ChevronDown, ChevronRight, Clock, Check,
  XCircle, Send, AlertCircle, Download
} from 'lucide-react'
import { GenerateDocumentButton } from '@/components/documents/generate-document-button'

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
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: Check },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle }
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
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null)
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
    <div>
      {/* Header with Add Button */}
      {!readonly && (
        <div className="px-3 py-1.5 border-b bg-white flex items-center justify-between">
          {changeOrders.length > 0 && (
            <div className="flex gap-2 text-[10px]">
              <span className="text-green-700">Approved: <span className="font-semibold">{formatCurrency(approvedTotal)}</span></span>
              <span className="text-yellow-700">Pending: <span className="font-semibold">{formatCurrency(pendingTotal)}</span></span>
            </div>
          )}
          {changeOrders.length === 0 && <div />}
          <button
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
            className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add CO
          </button>
        </div>
      )}

      {/* Create New CO Form */}
      {isCreating && (
        <div className="border-b p-3 bg-blue-50/50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newCO.title}
                onChange={(e) => setNewCO({ ...newCO, title: e.target.value })}
                placeholder="e.g., Add electrical outlets to Room 202"
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCO.description}
                  onChange={(e) => setNewCO({ ...newCO, description: e.target.value })}
                  placeholder="Details..."
                  rows={2}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={newCO.reason}
                  onChange={(e) => setNewCO({ ...newCO, reason: e.target.value })}
                  placeholder="Why..."
                  rows={2}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Line Items</label>
                <button type="button" onClick={addLineItem} className="text-[10px] text-primary-600 hover:text-primary-800">+ Add</button>
              </div>
              <div className="space-y-1">
                {newCO.lineItems.map((item, index) => (
                  <div key={index} className="flex gap-1 items-center bg-white p-1.5 rounded border text-xs">
                    <input type="text" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} placeholder="Description" className="flex-1 border rounded px-1.5 py-0.5 text-xs" />
                    <input type="number" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-14 border rounded px-1.5 py-0.5 text-xs text-right" step="0.01" />
                    <select value={item.unit} onChange={(e) => updateLineItem(index, 'unit', e.target.value)} className="border rounded px-1 py-0.5 text-xs">
                      {UNIT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.value}</option>))}
                    </select>
                    <input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-18 border rounded px-1.5 py-0.5 text-xs text-right" step="0.01" />
                    <span className="w-20 text-right text-xs">{formatCurrency(item.quantity * item.unitPrice)}</span>
                    {newCO.lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLineItem(index)} className="p-0.5 text-gray-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-right mt-1 text-xs font-medium">Total: {formatCurrency(calculateTotal())}</div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setIsCreating(false); setNewCO({ title: '', description: '', reason: '', lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' }] }) }} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={() => createMutation.mutate(newCO)} disabled={createMutation.isPending || !newCO.title} className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">{createMutation.isPending ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Orders List */}
      {changeOrders.length === 0 && !isCreating ? (
        <div className="px-3 py-4 text-center text-[10px] text-gray-500">No change orders</div>
      ) : changeOrders.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">CO #</th>
              <th className="px-3 py-1 text-left text-[10px] font-semibold text-gray-600">Title</th>
              <th className="px-3 py-1 text-center text-[10px] font-semibold text-gray-600 w-20">Status</th>
              <th className="px-3 py-1 text-right text-[10px] font-semibold text-gray-600 w-24">Amount</th>
              <th className="px-3 py-1 text-right text-[10px] font-semibold text-gray-600 w-20">Date</th>
            </tr>
          </thead>
          <tbody>
            {changeOrders.map((co, idx) => {
              const StatusIcon = STATUS_CONFIG[co.status].icon
              return (
                <tr
                  key={co.id}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  onClick={() => setSelectedCO(co)}
                >
                  <td className="px-3 py-1.5 font-medium text-gray-900">#{co.changeOrderNumber}</td>
                  <td className="px-3 py-1.5 text-gray-700 truncate max-w-[150px]">{co.title}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CONFIG[co.status].color}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {STATUS_CONFIG[co.status].label}
                    </span>
                  </td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${co.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {co.totalAmount >= 0 ? '+' : ''}{formatCurrency(co.totalAmount)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-500">{new Date(co.createdAt).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Change Order Detail Modal */}
      {selectedCO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">CO #{selectedCO.changeOrderNumber}</h3>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CONFIG[selectedCO.status].color}`}>
                  {STATUS_CONFIG[selectedCO.status].label}
                </span>
              </div>
              <button onClick={() => setSelectedCO(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Title</p>
                <p className="text-sm font-medium text-gray-900">{selectedCO.title}</p>
              </div>

              {/* Amount */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Amount</p>
                  <p className={`text-lg font-bold ${selectedCO.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedCO.totalAmount >= 0 ? '+' : ''}{formatCurrency(selectedCO.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Created</p>
                  <p className="text-xs text-gray-700">{new Date(selectedCO.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description & Reason */}
              {(selectedCO.description || selectedCO.reason) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedCO.description && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Description</p>
                      <p className="text-xs text-gray-700">{selectedCO.description}</p>
                    </div>
                  )}
                  {selectedCO.reason && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Reason</p>
                      <p className="text-xs text-gray-700">{selectedCO.reason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              {selectedCO.lineItems.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Line Items</p>
                  <table className="w-full text-xs border rounded">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-600">Description</th>
                        <th className="px-2 py-1 text-right text-[10px] font-semibold text-gray-600 w-12">Qty</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-600 w-10">Unit</th>
                        <th className="px-2 py-1 text-right text-[10px] font-semibold text-gray-600 w-16">Price</th>
                        <th className="px-2 py-1 text-right text-[10px] font-semibold text-gray-600 w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCO.lineItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
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
              {selectedCO.status === 'APPROVED' && selectedCO.approvedBy && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Approved by {selectedCO.approvedBy.firstName} {selectedCO.approvedBy.lastName} on {selectedCO.approvedAt ? new Date(selectedCO.approvedAt).toLocaleDateString() : 'N/A'}
                </div>
              )}
              {selectedCO.status === 'REJECTED' && (
                <div className="bg-red-50 px-2 py-1.5 rounded text-xs">
                  <span className="text-red-600">Rejected by {selectedCO.rejectedBy?.firstName} {selectedCO.rejectedBy?.lastName}</span>
                  {selectedCO.rejectionReason && <p className="text-red-700 mt-0.5">{selectedCO.rejectionReason}</p>}
                </div>
              )}

              {/* Generate Document */}
              <div className="pt-2 border-t">
                <GenerateDocumentButton recordType="change-order" recordId={selectedCO.id} templateType="CHANGE_ORDER" variant="dropdown" />
              </div>

              {/* Actions */}
              {!readonly && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {selectedCO.status === 'DRAFT' && (
                    <>
                      <button onClick={() => { updateStatusMutation.mutate({ id: selectedCO.id, status: 'PENDING_APPROVAL' }); setSelectedCO(null) }} disabled={updateStatusMutation.isPending} className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200">
                        <Send className="h-3 w-3 mr-1" />Submit
                      </button>
                      <button onClick={() => { if (confirm('Delete?')) { deleteMutation.mutate(selectedCO.id); setSelectedCO(null) } }} disabled={deleteMutation.isPending} className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800">
                        <Trash2 className="h-3 w-3 mr-1" />Delete
                      </button>
                    </>
                  )}
                  {selectedCO.status === 'PENDING_APPROVAL' && (
                    <>
                      <button onClick={() => { updateStatusMutation.mutate({ id: selectedCO.id, status: 'APPROVED' }); setSelectedCO(null) }} disabled={updateStatusMutation.isPending} className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200">
                        <Check className="h-3 w-3 mr-1" />Approve
                      </button>
                      <button onClick={() => { const reason = prompt('Reason for rejection:'); if (reason !== null) { updateStatusMutation.mutate({ id: selectedCO.id, status: 'REJECTED', rejectionReason: reason }); setSelectedCO(null) } }} disabled={updateStatusMutation.isPending} className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200">
                        <XCircle className="h-3 w-3 mr-1" />Reject
                      </button>
                      <button onClick={() => { updateStatusMutation.mutate({ id: selectedCO.id, status: 'DRAFT' }); setSelectedCO(null) }} disabled={updateStatusMutation.isPending} className="text-xs text-gray-600 hover:text-gray-800">
                        Return to Draft
                      </button>
                    </>
                  )}
                  {selectedCO.status === 'REJECTED' && (
                    <button onClick={() => { updateStatusMutation.mutate({ id: selectedCO.id, status: 'DRAFT' }); setSelectedCO(null) }} disabled={updateStatusMutation.isPending} className="text-xs text-gray-600 hover:text-gray-800">
                      Revise (Return to Draft)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
