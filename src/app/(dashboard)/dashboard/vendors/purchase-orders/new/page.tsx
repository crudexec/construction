'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Search
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

interface Vendor {
  id: string
  name: string
  companyName: string
  type: string
}

interface Project {
  id: string
  title: string
}

interface ProcurementItem {
  id: string
  name: string
  unit: string
  category: string
  defaultCost: number | null
}

interface CatalogEntry {
  itemId: string
  unitPrice: number
  itemName: string
  itemUnit: string
  itemCategory: string
}

interface LineItem {
  itemId: string
  itemName: string
  unit: string
  quantity: number
  unitPrice: number
}

const fetchVendors = async (): Promise<Vendor[]> => {
  const response = await fetch('/api/vendors?type=SUPPLY,SUPPLY_AND_INSTALLATION', {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch vendors')
  const data = await response.json()
  return data.data || data
}

const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch('/api/projects', {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch projects')
  const data = await response.json()
  return data.data || data
}

const fetchProcurementItems = async (): Promise<ProcurementItem[]> => {
  const response = await fetch('/api/procurement/items', {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch items')
  const data = await response.json()
  return data.items || data.data || data
}

const fetchVendorCatalog = async (vendorId: string): Promise<CatalogEntry[]> => {
  const response = await fetch(`/api/vendors/${vendorId}/catalog`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch catalog')
  return response.json()
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const { format, symbol } = useCurrency()

  const [form, setForm] = useState({
    vendorId: '',
    projectId: '',
    expectedDeliveryDate: '',
    notes: '',
    terms: '',
    tax: 0,
    shipping: 0
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-supply'],
    queryFn: fetchVendors
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects
  })

  const { data: allItems = [] } = useQuery({
    queryKey: ['procurement-items'],
    queryFn: fetchProcurementItems
  })

  const { data: vendorCatalog = [] } = useQuery({
    queryKey: ['vendor-catalog', form.vendorId],
    queryFn: () => fetchVendorCatalog(form.vendorId),
    enabled: !!form.vendorId
  })

  const createMutation = useMutation({
    mutationFn: async (data: {
      vendorId: string
      projectId: string | null
      expectedDeliveryDate: string | null
      notes: string | null
      terms: string | null
      tax: number
      shipping: number
      lineItems: { itemId: string; quantity: number; unitPrice: number }[]
    }) => {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create purchase order')
      }
      return response.json()
    },
    onSuccess: (data) => {
      router.push(`/dashboard/vendors/purchase-orders/${data.id}`)
    }
  })

  // Get price for item from vendor catalog
  const getItemPrice = (itemId: string): number | null => {
    const catalogEntry = vendorCatalog.find(c => c.itemId === itemId)
    return catalogEntry?.unitPrice || null
  }

  // Filter items for search
  const filteredItems = itemSearch
    ? allItems.filter(
        item =>
          item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
          item.category.toLowerCase().includes(itemSearch.toLowerCase())
      )
    : allItems

  const addLineItem = (item: ProcurementItem) => {
    if (lineItems.some(li => li.itemId === item.id)) {
      return // Already added
    }

    const catalogPrice = getItemPrice(item.id)
    setLineItems([
      ...lineItems,
      {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: 1,
        unitPrice: catalogPrice || item.defaultCost || 0
      }
    ])
    setItemSearch('')
    setShowItemDropdown(false)
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const total = subtotal + form.tax + form.shipping

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.vendorId) {
      alert('Please select a vendor')
      return
    }

    if (lineItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    createMutation.mutate({
      vendorId: form.vendorId,
      projectId: form.projectId || null,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      notes: form.notes || null,
      terms: form.terms || null,
      tax: form.tax,
      shipping: form.shipping,
      lineItems: lineItems.map(li => ({
        itemId: li.itemId,
        quantity: li.quantity,
        unitPrice: li.unitPrice
      }))
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/vendors?tab=purchase-orders"
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new purchase order for a vendor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor & Project */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <select
                    value={form.vendorId}
                    onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a vendor</option>
                    {vendors
                      .filter(v => v.type === 'SUPPLY' || v.type === 'SUPPLY_AND_INSTALLATION')
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.companyName || vendor.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <DatePicker
                    value={form.expectedDeliveryDate}
                    onChange={(date) => setForm({ ...form, expectedDeliveryDate: date })}
                    placeholder="Select date"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>

              {/* Add Item Search */}
              <div className="relative mb-4">
                <div className="flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items to add..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setShowItemDropdown(true)
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Dropdown */}
                {showItemDropdown && itemSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No items found</div>
                    ) : (
                      filteredItems.slice(0, 10).map((item) => {
                        const isInCatalog = vendorCatalog.some(c => c.itemId === item.id)
                        const catalogPrice = getItemPrice(item.id)
                        const alreadyAdded = lineItems.some(li => li.itemId === item.id)

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => !alreadyAdded && addLineItem(item)}
                            disabled={alreadyAdded}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                              alreadyAdded ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.category} &bull; {item.unit}
                              </div>
                            </div>
                            {isInCatalog && catalogPrice && (
                              <span className="text-sm text-green-600 font-medium">
                                {format(catalogPrice)}
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              {lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No items added yet</p>
                  <p className="text-sm text-gray-400">Search above to add items</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                          Total
                        </th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lineItems.map((item, index) => (
                        <tr key={item.itemId}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.itemName}</div>
                            <div className="text-xs text-gray-500">{item.unit}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <span className="text-gray-500 mr-1">{symbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {format(item.quantity * item.unitPrice)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes & Terms */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notes & Terms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Notes for internal reference..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Payment terms, delivery conditions..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({lineItems.length} items)</span>
                  <span className="text-gray-900 font-medium">{format(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tax</span>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">{symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })}
                      className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">{symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shipping}
                      onChange={(e) => setForm({ ...form, shipping: parseFloat(e.target.value) || 0 })}
                      className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="text-gray-900 font-medium">Total</span>
                  <span className="text-xl font-semibold text-gray-900">{format(total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.vendorId || lineItems.length === 0}
                  className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
                </button>
                <Link
                  href="/dashboard/vendors?tab=purchase-orders"
                  className="block w-full py-2 px-4 text-center border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>

              {createMutation.error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {createMutation.error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Click outside to close dropdown */}
      {showItemDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowItemDropdown(false)}
        />
      )}
    </div>
  )
}
