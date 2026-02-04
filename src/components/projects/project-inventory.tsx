'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Minus,
  History,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Star
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

interface InventoryEntry {
  id: string
  purchasedQty: number
  usedQty: number
  minStockLevel: number | null
  item: {
    id: string
    name: string
    description: string | null
    category: string
    unit: string
    defaultCost: number | null
    sku: string | null
  }
  purchases: {
    id: string
    quantity: number
    unitCost: number
    totalCost: number
    purchaseDate: string
    invoiceNumber: string | null
    supplier: { id: string; name: string; companyName: string } | null
    recordedBy: { id: string; firstName: string; lastName: string }
  }[]
  usageRecords: {
    id: string
    quantity: number
    usageDate: string
    usedFor: string | null
    recordedBy: { id: string; firstName: string; lastName: string }
  }[]
}

interface ProcurementItem {
  id: string
  name: string
  category: string
  unit: string
  defaultCost: number | null
  sku: string | null
}

interface ProjectInventoryProps {
  projectId: string
}

export function ProjectInventory({ projectId }: ProjectInventoryProps) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [minStockLevel, setMinStockLevel] = useState('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Purchase/Usage modal state
  const [modalMode, setModalMode] = useState<'purchase' | 'usage' | null>(null)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    quantity: '',
    unitCost: '',
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [usageForm, setUsageForm] = useState({
    quantity: '',
    usageDate: new Date().toISOString().split('T')[0],
    usedFor: ''
  })

  // Fetch project inventory
  const { data, isLoading } = useQuery({
    queryKey: ['project-inventory', projectId],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/projects/${projectId}/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch inventory')
      return response.json()
    }
  })

  // Fetch procurement items for adding
  const { data: itemsData } = useQuery({
    queryKey: ['procurement-items-list'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/procurement/items?activeOnly=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch items')
      return response.json()
    },
    enabled: showAddItem
  })

  // Fetch vendors for purchase form
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/vendors?type=SUPPLY', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch vendors')
      return response.json()
    },
    enabled: modalMode === 'purchase'
  })

  // Fetch price comparisons for active item
  const { data: priceComparisons } = useQuery({
    queryKey: ['item-prices', activeItemId],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${activeItemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch item prices')
      const data = await response.json()
      return {
        preferredVendorId: data.preferredVendorId,
        priceComparisons: data.priceComparisons || []
      }
    },
    enabled: modalMode === 'purchase' && !!activeItemId
  })

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/projects/${projectId}/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: selectedItemId,
          minStockLevel: minStockLevel ? parseFloat(minStockLevel) : null
        })
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to add item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-inventory', projectId] })
      toast.success('Item added to inventory')
      setShowAddItem(false)
      setSelectedItemId('')
      setMinStockLevel('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const recordPurchaseMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/inventory/${activeEntryId}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: parseFloat(purchaseForm.quantity),
          unitCost: parseFloat(purchaseForm.unitCost),
          supplierId: purchaseForm.supplierId || null,
          invoiceNumber: purchaseForm.invoiceNumber || null,
          purchaseDate: purchaseForm.purchaseDate,
          notes: purchaseForm.notes || null
        })
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to record purchase')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-inventory', projectId] })
      toast.success('Purchase recorded')
      setModalMode(null)
      setActiveEntryId(null)
      setActiveItemId(null)
      setPurchaseForm({
        quantity: '',
        unitCost: '',
        supplierId: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const recordUsageMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/inventory/${activeEntryId}/usage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: parseFloat(usageForm.quantity),
          usageDate: usageForm.usageDate,
          usedFor: usageForm.usedFor || null
        })
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to record usage')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-inventory', projectId] })
      toast.success('Usage recorded')
      setModalMode(null)
      setActiveEntryId(null)
      setUsageForm({
        quantity: '',
        usageDate: new Date().toISOString().split('T')[0],
        usedFor: ''
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const inventory: InventoryEntry[] = data?.inventory || []
  const totals = data?.totals || { totalItems: 0, totalPurchaseCost: 0, lowStockItems: 0 }
  const items: ProcurementItem[] = itemsData?.items || []
  const existingItemIds = new Set(inventory.map(e => e.item.id))
  const availableItems = items.filter(i => !existingItemIds.has(i.id))

  // Filter inventory by search
  const filteredInventory = inventory.filter(entry =>
    entry.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Items Tracked</p>
              <p className="text-xl font-semibold">{totals.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.totalPurchaseCost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totals.lowStockItems > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-5 w-5 ${totals.lowStockItems > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-xl font-semibold">{totals.lowStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/vendors?tab=catalog"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            <ShoppingCart className="h-4 w-4" />
            View Catalog
          </Link>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Add Item to Inventory</h3>
            <button onClick={() => setShowAddItem(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Choose an item...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) - {item.unit}
                  </option>
                ))}
              </select>
              {availableItems.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  All items are already in this project.{' '}
                  <Link href="/dashboard/vendors/catalog/new" className="text-primary-600 hover:underline">
                    Create a new item
                  </Link>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input
                type="number"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
                min="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddItem(false)}
              className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => addItemMutation.mutate()}
              disabled={!selectedItemId || addItemMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      {/* Inventory List */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Items</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'No items match your search' : 'Start tracking materials and supplies for this project'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddItem(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInventory.map(entry => {
            const remaining = entry.purchasedQty - entry.usedQty
            const isLowStock = entry.minStockLevel !== null && remaining <= entry.minStockLevel
            const isExpanded = expandedEntry === entry.id
            const totalSpent = entry.purchases.reduce((sum, p) => sum + p.totalCost, 0)

            return (
              <div key={entry.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Main Row */}
                <div
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${isLowStock ? 'border-l-4 border-l-red-500' : ''}`}
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{entry.item.name}</h4>
                        <p className="text-sm text-gray-500">
                          {entry.item.category}
                          {entry.item.sku && ` • SKU: ${entry.item.sku}`}
                        </p>
                      </div>
                      {isLowStock && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Remaining</p>
                        <p className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {remaining.toFixed(0)} {entry.item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveEntryId(entry.id)
                            setActiveItemId(entry.item.id)
                            setModalMode('purchase')
                            if (entry.item.defaultCost) {
                              setPurchaseForm(f => ({ ...f, unitCost: entry.item.defaultCost!.toString() }))
                            }
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Record Purchase"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveEntryId(entry.id)
                            setModalMode('usage')
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Record Usage"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
                    <span>Purchased: {entry.purchasedQty.toFixed(0)} {entry.item.unit}</span>
                    <span>Used: {entry.usedQty.toFixed(0)} {entry.item.unit}</span>
                    <span>Total Spent: ${totalSpent.toFixed(2)}</span>
                    {entry.minStockLevel !== null && (
                      <span>Min Level: {entry.minStockLevel} {entry.item.unit}</span>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Recent Purchases */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Plus className="h-4 w-4 text-green-600" />
                          Recent Purchases
                        </h5>
                        {entry.purchases.length > 0 ? (
                          <div className="space-y-2">
                            {entry.purchases.slice(0, 5).map(p => (
                              <div key={p.id} className="text-sm bg-white p-2 rounded border">
                                <div className="flex justify-between">
                                  <span className="font-medium">+{p.quantity} {entry.item.unit}</span>
                                  <span className="text-gray-500">${p.totalCost.toFixed(2)}</span>
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                  {format(new Date(p.purchaseDate), 'MMM d, yyyy')}
                                  {p.supplier && ` • ${p.supplier.companyName || p.supplier.name}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No purchases recorded</p>
                        )}
                      </div>

                      {/* Recent Usage */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Minus className="h-4 w-4 text-orange-600" />
                          Recent Usage
                        </h5>
                        {entry.usageRecords.length > 0 ? (
                          <div className="space-y-2">
                            {entry.usageRecords.slice(0, 5).map(u => (
                              <div key={u.id} className="text-sm bg-white p-2 rounded border">
                                <div className="flex justify-between">
                                  <span className="font-medium">-{u.quantity} {entry.item.unit}</span>
                                  <span className="text-gray-500">
                                    {format(new Date(u.usageDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                {u.usedFor && (
                                  <div className="text-gray-500 text-xs mt-1">{u.usedFor}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No usage recorded</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <Link
                        href={`/dashboard/vendors/catalog/${entry.item.id}`}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <History className="h-4 w-4" />
                        View Full History
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Purchase Modal */}
      {modalMode === 'purchase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => { setModalMode(null); setActiveItemId(null) }} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Purchase</h3>
              <button onClick={() => { setModalMode(null); setActiveItemId(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                  <input
                    type="number"
                    value={purchaseForm.unitCost}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) => {
                    const vendorId = e.target.value
                    setPurchaseForm(f => ({ ...f, supplierId: vendorId }))
                    // Auto-populate unit cost from vendor's catalog price
                    if (vendorId && priceComparisons?.priceComparisons) {
                      const vendorPrice = priceComparisons.priceComparisons.find(
                        (p: { vendor: { id: string }; unitPrice: number }) => p.vendor.id === vendorId
                      )
                      if (vendorPrice) {
                        setPurchaseForm(f => ({ ...f, unitCost: vendorPrice.unitPrice.toString() }))
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select supplier (optional)</option>
                  {/* Show preferred vendor first if exists */}
                  {priceComparisons?.preferredVendorId && vendorsData && (
                    (() => {
                      const preferredVendor = vendorsData.find(
                        (v: { id: string }) => v.id === priceComparisons.preferredVendorId
                      )
                      const preferredPrice = priceComparisons.priceComparisons.find(
                        (p: { vendor: { id: string } }) => p.vendor.id === priceComparisons.preferredVendorId
                      )
                      if (preferredVendor) {
                        return (
                          <option key={preferredVendor.id} value={preferredVendor.id}>
                            {preferredVendor.companyName || preferredVendor.name} (Preferred)
                            {preferredPrice && ` - $${preferredPrice.unitPrice.toFixed(2)}`}
                          </option>
                        )
                      }
                      return null
                    })()
                  )}
                  {/* Show other vendors with catalog prices */}
                  {vendorsData?.filter(
                    (v: { id: string }) => v.id !== priceComparisons?.preferredVendorId
                  ).map((v: { id: string; name: string; companyName: string }) => {
                    const vendorPrice = priceComparisons?.priceComparisons?.find(
                      (p: { vendor: { id: string }; unitPrice: number }) => p.vendor.id === v.id
                    )
                    return (
                      <option key={v.id} value={v.id}>
                        {v.companyName || v.name}
                        {vendorPrice && ` - $${vendorPrice.unitPrice.toFixed(2)}`}
                      </option>
                    )
                  })}
                </select>
                {priceComparisons?.preferredVendorId && purchaseForm.supplierId === priceComparisons.preferredVendorId && (
                  <p className="mt-1 text-xs text-yellow-600 flex items-center">
                    <Star className="h-3 w-3 mr-1" />
                    Preferred vendor for this item
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
                  <input
                    type="text"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {purchaseForm.quantity && purchaseForm.unitCost && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">
                      ${(parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.unitCost)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => { setModalMode(null); setActiveItemId(null) }}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => recordPurchaseMutation.mutate()}
                  disabled={!purchaseForm.quantity || !purchaseForm.unitCost || recordPurchaseMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {recordPurchaseMutation.isPending ? 'Recording...' : 'Record Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {modalMode === 'usage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setModalMode(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Usage</h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Used *</label>
                  <input
                    type="number"
                    value={usageForm.quantity}
                    onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={usageForm.usageDate}
                    onChange={(e) => setUsageForm({ ...usageForm, usageDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Used For</label>
                <input
                  type="text"
                  value={usageForm.usedFor}
                  onChange={(e) => setUsageForm({ ...usageForm, usedFor: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe what it was used for (optional)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => recordUsageMutation.mutate()}
                  disabled={!usageForm.quantity || recordUsageMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {recordUsageMutation.isPending ? 'Recording...' : 'Record Usage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
