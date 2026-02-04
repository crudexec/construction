'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { useCurrency } from '@/hooks/useCurrency'

interface AddBOQItemModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  editItem?: any
}

async function createBOQItem(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/boq`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create BOQ item')
  }
  return response.json()
}

async function updateBOQItem(itemId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/boq/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update BOQ item')
  }
  return response.json()
}

export function AddBOQItemModal({ projectId, isOpen, onClose, editItem }: AddBOQItemModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { symbol: currencySymbol, format: formatCurrency } = useCurrency()

  const [formData, setFormData] = useState({
    itemNumber: '',
    name: '',
    description: '',
    category: '',
    subCategory: '',
    unit: '',
    quantity: '',
    unitRate: '',
    actualCost: '',
    notes: '',
    specifications: '',
    isContingency: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch existing BOQ items for auto-numbering
  const { data: boqData } = useQuery({
    queryKey: ['boq', projectId],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${projectId}/boq`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch BOQ')
      return response.json()
    },
    enabled: isOpen && !editItem
  })

  const existingItems = boqData?.items || []

  // Get unique categories from existing BOQ items
  const existingBOQCategories = Array.from(new Set(existingItems.map((item: any) => item.category))).sort()

  // Auto-generate item number based on category
  const generateItemNumber = (category: string) => {
    if (!category) return ''

    // Get all unique categories from existing items
    const uniqueCategories = Array.from(new Set(existingItems.map((item: any) => item.category)))

    // Find or assign category number
    let categoryIndex = uniqueCategories.indexOf(category)
    if (categoryIndex === -1) {
      // New category - assign next available category number
      categoryIndex = uniqueCategories.length
    }
    const categoryNumber = categoryIndex + 1

    // Count items in this category
    const itemsInCategory = existingItems.filter((item: any) => item.category === category)
    const itemNumber = itemsInCategory.length + 1

    return `${categoryNumber}.${itemNumber}`
  }

  // Auto-suggest item number when category changes
  useEffect(() => {
    if (!editItem && formData.category && existingItems.length >= 0) {
      const suggestedNumber = generateItemNumber(formData.category)
      if (suggestedNumber) {
        setFormData(prev => ({
          ...prev,
          itemNumber: suggestedNumber
        }))
      }
    }
  }, [formData.category, existingItems, editItem])

  useEffect(() => {
    if (editItem) {
      setFormData({
        itemNumber: editItem.itemNumber || '',
        name: editItem.name || '',
        description: editItem.description || '',
        category: editItem.category || '',
        subCategory: editItem.subCategory || '',
        unit: editItem.unit || '',
        quantity: editItem.quantity?.toString() || '',
        unitRate: editItem.unitRate?.toString() || '',
        actualCost: editItem.actualCost?.toString() || '',
        notes: editItem.notes || '',
        specifications: editItem.specifications || '',
        isContingency: editItem.isContingency || false
      })
    } else {
      setFormData({
        itemNumber: '',
        name: '',
        description: '',
        category: '',
        subCategory: '',
        unit: '',
        quantity: '',
        unitRate: '',
        actualCost: '',
        notes: '',
        specifications: '',
        isContingency: false
      })
    }
    setErrors({})
  }, [editItem, isOpen])

  const createMutation = useMutation({
    mutationFn: (data: any) => createBOQItem(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', projectId] })
      toast.success('BOQ item created successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create BOQ item')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateBOQItem(editItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', projectId] })
      toast.success('BOQ item updated successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update BOQ item')
    }
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.itemNumber.trim()) {
      newErrors.itemNumber = 'Item number is required'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required'
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    if (!formData.unitRate || parseFloat(formData.unitRate) < 0) {
      newErrors.unitRate = 'Unit rate must be 0 or greater'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error('Please fix the errors in the form')
      return
    }

    const data = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      unitRate: parseFloat(formData.unitRate),
      actualCost: formData.actualCost ? parseFloat(formData.actualCost) : null
    }

    if (editItem) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const totalCost = formData.quantity && formData.unitRate
    ? parseFloat(formData.quantity) * parseFloat(formData.unitRate)
    : 0

  if (!isOpen) return null

  const commonUnits = ['piece', 'kg', 'lb', 'meter', 'foot', 'sqft', 'sqm', 'liter', 'gallon', 'bag', 'box', 'roll']

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editItem ? 'Edit BOQ Item' : 'Add BOQ Item'}
              </h3>
              <button
                onClick={onClose}
                className="text-purple-100 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category <span className="text-red-500">*</span>
                      {existingBOQCategories.length > 0 && (
                        <span className="text-xs text-slate-500 font-normal ml-1">(select from existing or add new)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      list="boq-categories"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-2 border ${errors.category ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="Type or select a category"
                    />
                    <datalist id="boq-categories">
                      {existingBOQCategories.map((cat: string) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                    {existingBOQCategories.length > 0 && !errors.category && (
                      <p className="text-xs text-slate-500 mt-1">
                        Existing: {existingBOQCategories.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Item Number <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-1">(auto-suggested)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.itemNumber}
                      onChange={(e) => setFormData({ ...formData, itemNumber: e.target.value })}
                      className={`w-full px-3 py-2 border ${errors.itemNumber ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50`}
                      placeholder="Auto-generated"
                    />
                    {errors.itemNumber && <p className="text-red-500 text-xs mt-1">{errors.itemNumber}</p>}
                    {!errors.itemNumber && formData.itemNumber && (
                      <p className="text-xs text-slate-500 mt-1">You can edit this if needed</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    placeholder="e.g., Site Clearing, Concrete Foundation"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className={`w-full px-3 py-2 border ${errors.quantity ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="0.00"
                    />
                    {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className={`w-full px-3 py-2 border ${errors.unit ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="e.g., m3, sq ft"
                    />
                    {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unit Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unitRate}
                      onChange={(e) => setFormData({ ...formData, unitRate: e.target.value })}
                      className={`w-full px-3 py-2 border ${errors.unitRate ? 'border-red-300' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="0.00"
                    />
                    {errors.unitRate && <p className="text-red-500 text-xs mt-1">{errors.unitRate}</p>}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Total Estimated Cost</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.quantity || '0'} {formData.unit || 'units'} × {currencySymbol}{formData.unitRate || '0'} per unit
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Actual Cost (Optional)
                    <span className="text-xs text-slate-500 font-normal ml-1">- for variance tracking</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actualCost}
                      onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the actual cost if different from estimated. Leave blank to calculate from purchase orders.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sub-Category
                  </label>
                  <input
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional sub-category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Specifications
                  </label>
                  <textarea
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Technical specifications..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isContingency"
                    checked={formData.isContingency}
                    onChange={(e) => setFormData({ ...formData, isContingency: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                  />
                  <label htmlFor="isContingency" className="ml-2 block text-sm text-slate-700">
                    Mark as contingency item
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editItem
                      ? 'Update Item'
                      : 'Add Item'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
    </div>
  )
}
