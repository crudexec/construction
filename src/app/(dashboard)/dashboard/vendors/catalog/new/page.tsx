'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

export default function NewProcurementItemPage() {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    defaultCost: '',
    sku: '',
    complianceInfo: ''
  })

  // Get existing categories for suggestions
  const { data: existingData } = useQuery({
    queryKey: ['procurement-items-categories'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/procurement/items?activeOnly=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    }
  })

  const categories: string[] = existingData?.categories || []

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/procurement/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category: form.category,
          unit: form.unit,
          defaultCost: form.defaultCost ? parseFloat(form.defaultCost) : null,
          sku: form.sku || null,
          complianceInfo: form.complianceInfo || null
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create item')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Item created successfully')
      router.push(`/dashboard/vendors/catalog/${data.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.category || !form.unit) {
      toast.error('Name, category, and unit are required')
      return
    }

    createMutation.mutate()
  }

  const commonUnits = ['piece', 'kg', 'lb', 'meter', 'foot', 'sqft', 'sqm', 'liter', 'gallon', 'bag', 'box', 'roll']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vendors?tab=catalog"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Procurement Item</h1>
          <p className="text-gray-600">Create a new item for your catalog</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Portland Cement"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="categories"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Building Materials"
              required
            />
            <datalist id="categories">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">Type to add new or select existing</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="units"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., bag, kg, piece"
              required
            />
            <datalist id="units">
              {commonUnits.map(unit => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
              <input
                type="number"
                value={form.defaultCost}
                onChange={(e) => setForm({ ...form, defaultCost: e.target.value })}
                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Per unit cost (can add vendor prices later)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., CEM-PORT-50"
            />
            <p className="text-xs text-gray-500 mt-1">Unique product identifier (optional)</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Describe the item, specifications, or common uses..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compliance Information
          </label>
          <textarea
            value={form.complianceInfo}
            onChange={(e) => setForm({ ...form, complianceInfo: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Certifications, standards compliance, safety requirements..."
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2 text-gray-500">
            <Package className="h-5 w-5" />
            <span className="text-sm">You can add photos and vendor prices after creating</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/vendors?tab=catalog"
              className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
