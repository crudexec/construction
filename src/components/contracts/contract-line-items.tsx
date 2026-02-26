'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit, Save, X, Package } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string | null
  order: number
}

interface ContractLineItemsProps {
  contractId: string
  readonly?: boolean
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

export function ContractLineItems({ contractId, readonly = false }: ContractLineItemsProps) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit: 'EA',
    unitPrice: 0,
    notes: ''
  })
  const [editItem, setEditItem] = useState<Partial<LineItem>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['contract-line-items', contractId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}/line-items`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch line items')
      return response.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const response = await fetch(`/api/contracts/${contractId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item)
      })
      if (!response.ok) throw new Error('Failed to create line item')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-line-items', contractId] })
      setIsAdding(false)
      setNewItem({ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<LineItem>) => {
      const response = await fetch(`/api/contracts/${contractId}/line-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update line item')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-line-items', contractId] })
      setEditingId(null)
      setEditItem({})
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/contracts/${contractId}/line-items/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to delete line item')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-line-items', contractId] })
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const lineItems: LineItem[] = data?.lineItems || []
  const totalAmount = data?.totalAmount || 0

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
          <Package className="h-4 w-4" />
          Line Items
        </h4>
        {!readonly && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </button>
        )}
      </div>

      {lineItems.length === 0 && !isAdding ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No line items</p>
          {!readonly && (
            <p className="text-xs text-gray-400">Add itemized breakdown of the contract</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                {!readonly && <th className="px-4 py-2 w-20"></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItems.map((item) => (
                <tr key={item.id}>
                  {editingId === item.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editItem.description ?? item.description}
                          onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editItem.quantity ?? item.quantity}
                          onChange={(e) => setEditItem({ ...editItem, quantity: parseFloat(e.target.value) })}
                          className="w-20 border rounded px-2 py-1 text-sm text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editItem.unit ?? item.unit}
                          onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {UNIT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editItem.unitPrice ?? item.unitPrice}
                          onChange={(e) => setEditItem({ ...editItem, unitPrice: parseFloat(e.target.value) })}
                          className="w-24 border rounded px-2 py-1 text-sm text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        {formatCurrency((editItem.quantity ?? item.quantity) * (editItem.unitPrice ?? item.unitPrice))}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => updateMutation.mutate({ id: item.id, ...editItem })}
                            disabled={updateMutation.isPending}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditItem({}) }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-500">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{item.unit}</td>
                      <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                      {!readonly && (
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingId(item.id); setEditItem({}) }}
                              className="p-1 text-gray-400 hover:text-primary-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this line item?')) {
                                  deleteMutation.mutate(item.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}

              {isAdding && (
                <tr className="bg-blue-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Description"
                      className="w-full border rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-20 border rounded px-2 py-1 text-sm text-right"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-24 border rounded px-2 py-1 text-sm text-right"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {formatCurrency(newItem.quantity * newItem.unitPrice)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => createMutation.mutate(newItem)}
                        disabled={createMutation.isPending || !newItem.description}
                        className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false)
                          setNewItem({ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '' })
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                  Total:
                </td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </td>
                {!readonly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
