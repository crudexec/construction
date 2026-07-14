'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface CreateEstimateModalProps {
  projectId: string
  projectNumber: string | null | undefined
  vendorId: string
  vendorName: string
  onClose: () => void
}

interface CostCodeOption {
  id: string
  code: string
  name: string
}

interface LineItemFormRow {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  costCodeId: string
  specSection: string
}

interface EstimateFormData {
  contractNumber: string
  totalSum: string
  lineItems: LineItemFormRow[]
}

const UNIT_OPTIONS = ['EA', 'SF', 'LF', 'HR', 'DAY', 'LS', 'CY', 'TON', 'GAL', '%']

const emptyLineItem = (): LineItemFormRow => ({
  description: '',
  quantity: 1,
  unit: 'EA',
  unitPrice: 0,
  costCodeId: '',
  specSection: ''
})

async function createEstimate(vendorId: string, projectId: string, data: EstimateFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const validLineItems = data.lineItems.filter(item => item.description.trim())

  const response = await fetch(`/api/vendors/${vendorId}/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({
      contractNumber: data.contractNumber,
      totalSum: parseFloat(data.totalSum),
      estimateAmount: parseFloat(data.totalSum),
      projectIds: [projectId],
      lineItems: validLineItems.length > 0 ? validLineItems.map(item => ({
        ...item,
        costCodeId: item.costCodeId || undefined
      })) : undefined
    })
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create estimate')
  return result
}

export function CreateEstimateModal({ projectId, projectNumber, vendorId, vendorName, onClose }: CreateEstimateModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showLineItems, setShowLineItems] = useState(false)

  const [formData, setFormData] = useState<EstimateFormData>({
    contractNumber: '',
    totalSum: '',
    lineItems: []
  })

  const { data: costCodes = [] } = useQuery<CostCodeOption[]>({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]
      const response = await fetch('/api/cost-codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch cost codes')
      return response.json()
    },
    enabled: showLineItems
  })

  const createMutation = useMutation({
    mutationFn: (data: EstimateFormData) => createEstimate(vendorId, projectId, data),
    onSuccess: (contract) => {
      toast.success('Estimate created')
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
      onClose()
      router.push(`/dashboard/vendors/${vendorId}/contracts/${contract.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const addLineItem = () => {
    setFormData({ ...formData, lineItems: [...formData.lineItems, emptyLineItem()] })
  }

  const removeLineItem = (index: number) => {
    setFormData({ ...formData, lineItems: formData.lineItems.filter((_, i) => i !== index) })
  }

  const updateLineItem = (index: number, field: keyof LineItemFormRow, value: string | number) => {
    const updated = [...formData.lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, lineItems: updated })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contractNumber.trim()) {
      toast.error('PO Number is required')
      return
    }
    if (!formData.totalSum || parseFloat(formData.totalSum) < 0) {
      toast.error('Estimate Amount is required')
      return
    }

    createMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h3 className="text-lg font-medium text-gray-900">Create Estimate</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500">Vendor:</span>{' '}
                <span className="font-medium text-gray-900">{vendorName}</span>
              </div>
              <div>
                <span className="text-gray-500">Project Number:</span>{' '}
                {projectNumber ? (
                  <span className="font-medium text-gray-900 font-mono">{projectNumber}</span>
                ) : (
                  <span className="text-gray-400">Not set — edit on the project page</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., job number + primary CSI code"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimate Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalSum}
                    onChange={(e) => setFormData({ ...formData, totalSum: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Optional line items */}
            <div className="border-t border-gray-200 pt-4">
              {!showLineItems ? (
                <button
                  type="button"
                  onClick={() => { setShowLineItems(true); addLineItem() }}
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                >
                  <Plus className="h-4 w-4" />
                  Add line items (optional)
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Line Items</label>
                    <button type="button" onClick={addLineItem} className="text-xs text-primary-600 hover:text-primary-800">+ Add row</button>
                  </div>
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded border text-xs space-y-1">
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1 border rounded px-1.5 py-1 text-xs"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-14 border rounded px-1.5 py-1 text-xs text-right"
                          step="0.01"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          className="border rounded px-1 py-1 text-xs"
                        >
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 border rounded px-1.5 py-1 text-xs text-right"
                          step="0.01"
                        />
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex gap-1 items-center">
                        <select
                          value={item.costCodeId}
                          onChange={(e) => updateLineItem(index, 'costCodeId', e.target.value)}
                          className="border rounded px-1 py-1 text-[10px] flex-1"
                        >
                          <option value="">No cost code</option>
                          {costCodes.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.specSection}
                          onChange={(e) => updateLineItem(index, 'specSection', e.target.value)}
                          placeholder="Spec section"
                          className="w-28 border rounded px-1.5 py-1 text-[10px]"
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-500">
                    Line item totals will supersede the Estimate Amount as the contract value — the Estimate Amount above is always kept for reference.
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              You'll be taken to the estimate's page next{showLineItems ? '' : ' to add line items with cost codes and spec sections'}.
            </p>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Estimate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
