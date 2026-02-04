'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Star,
  Plus,
  Trash2,
  Edit,
  Calendar,
  AlertCircle,
  BarChart3,
  Clock
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import Link from 'next/link'

interface CatalogItem {
  id: string
  itemId: string
  vendorId: string
  unitPrice: number
  minQuantity: number | null
  validFrom: string | null
  validUntil: string | null
  notes: string | null
  isPreferred: boolean
  leadTimeDays: number | null
  vendorSku: string | null
  lastPurchaseDate: string | null
  totalPurchasedQty: number
  totalPurchasedValue: number
  createdAt: string
  updatedAt: string
  itemName: string
  itemDescription: string | null
  itemCategory: string
  itemUnit: string
  itemDefaultCost: number | null
  itemSku: string | null
  itemPhotos: string | null
  itemIsActive: boolean
}

interface ProcurementStats {
  summary: {
    catalogItemCount: number
    preferredItemsCount: number
    totalPurchaseValue: number
    totalPurchaseCount: number
    totalQuantityPurchased: number
    averageOrderValue: number
    uniqueItemCount: number
    uniqueProjectCount: number
    purchaseOrderCount: number
    purchaseOrderTotalValue: number
  }
  monthlyTrends: Array<{
    month: string
    count: number
    value: number
  }>
  topItems: Array<{
    itemId: string
    itemName: string
    category: string
    quantity: number
    value: number
  }>
  recentPurchases: Array<{
    id: string
    itemName: string
    itemCategory: string
    projectName: string
    projectId: string
    quantity: number
    unitCost: number
    totalCost: number
    purchaseDate: string
    invoiceNumber: string | null
  }>
}

interface ProcurementItem {
  id: string
  name: string
  category: string
  unit: string
}

interface VendorProcurementTabProps {
  vendorId: string
  vendorType: string
}

const fetchCatalog = async (vendorId: string): Promise<CatalogItem[]> => {
  const response = await fetch(`/api/vendors/${vendorId}/catalog`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch catalog')
  return response.json()
}

const fetchProcurementStats = async (vendorId: string): Promise<ProcurementStats> => {
  const response = await fetch(`/api/vendors/${vendorId}/procurement-stats`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch procurement stats')
  return response.json()
}

const fetchProcurementItems = async (): Promise<ProcurementItem[]> => {
  const response = await fetch('/api/procurement/items', {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch procurement items')
  const data = await response.json()
  return data.items || data.data || data
}

export default function VendorProcurementTab({ vendorId, vendorType }: VendorProcurementTabProps) {
  const { format } = useCurrency()
  const queryClient = useQueryClient()
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [addItemForm, setAddItemForm] = useState({
    itemId: '',
    unitPrice: '',
    minQuantity: '',
    leadTimeDays: '',
    vendorSku: '',
    notes: ''
  })

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['vendor-catalog', vendorId],
    queryFn: () => fetchCatalog(vendorId),
    enabled: !!vendorId
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['vendor-procurement-stats', vendorId],
    queryFn: () => fetchProcurementStats(vendorId),
    enabled: !!vendorId
  })

  const { data: allItems = [] } = useQuery({
    queryKey: ['procurement-items-list'],
    queryFn: fetchProcurementItems,
    enabled: isAddItemModalOpen
  })

  // Filter out items already in catalog
  const availableItems = allItems.filter(
    item => !catalog.some(c => c.itemId === item.id)
  )

  const addToMutation = useMutation({
    mutationFn: async (data: typeof addItemForm) => {
      const response = await fetch(`/api/vendors/${vendorId}/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemId: data.itemId,
          unitPrice: parseFloat(data.unitPrice),
          minQuantity: data.minQuantity ? parseFloat(data.minQuantity) : null,
          leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
          vendorSku: data.vendorSku || null,
          notes: data.notes || null
        })
      })
      if (!response.ok) throw new Error('Failed to add item to catalog')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-catalog', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor-procurement-stats', vendorId] })
      setIsAddItemModalOpen(false)
      setAddItemForm({
        itemId: '',
        unitPrice: '',
        minQuantity: '',
        leadTimeDays: '',
        vendorSku: '',
        notes: ''
      })
    }
  })

  const removeFromCatalogMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/vendors/${vendorId}/catalog?itemId=${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to remove item from catalog')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-catalog', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor-procurement-stats', vendorId] })
    }
  })

  const isSupplyVendor = vendorType === 'SUPPLY' || vendorType === 'SUPPLY_AND_INSTALLATION'

  if (!isSupplyVendor) {
    return (
      <div className="bg-white rounded-lg shadow border p-8 text-center">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Procurement Not Available</h3>
        <p className="text-gray-500">
          This vendor is classified as &quot;Installation Only&quot; and does not supply materials.
          Change the vendor type to &quot;Supply&quot; or &quot;Supply & Installation&quot; to enable procurement features.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Purchase Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? '...' : format(stats?.summary.totalPurchaseValue || 0)}
              </p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats?.summary.totalPurchaseCount || 0} purchases recorded
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Catalog Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? '...' : stats?.summary.catalogItemCount || 0}
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats?.summary.preferredItemsCount || 0} as preferred vendor
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Order</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? '...' : format(stats?.summary.averageOrderValue || 0)}
              </p>
            </div>
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Across {stats?.summary.uniqueProjectCount || 0} projects
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Purchase Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsLoading ? '...' : stats?.summary.purchaseOrderCount || 0}
              </p>
            </div>
            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {format(stats?.summary.purchaseOrderTotalValue || 0)} total value
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catalog Section */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Supplier Catalog</h3>
            <button
              onClick={() => setIsAddItemModalOpen(true)}
              className="flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {catalogLoading ? (
              <div className="p-6 text-center text-gray-500">Loading catalog...</div>
            ) : catalog.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>No items in catalog</p>
                <button
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  Add first item
                </button>
              </div>
            ) : (
              catalog.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/vendors/catalog/${item.itemId}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {item.itemName}
                        </Link>
                        {item.isPreferred && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Preferred
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {item.itemCategory} &bull; {item.itemUnit}
                      </p>
                      <div className="mt-1 flex items-center space-x-4 text-sm">
                        <span className="text-gray-900 font-medium">
                          {format(item.unitPrice)}/{item.itemUnit}
                        </span>
                        {item.leadTimeDays && (
                          <span className="text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.leadTimeDays} days
                          </span>
                        )}
                        {item.vendorSku && (
                          <span className="text-gray-400">SKU: {item.vendorSku}</span>
                        )}
                      </div>
                      {item.totalPurchasedQty > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.totalPurchasedQty} units purchased ({format(item.totalPurchasedValue)})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Remove this item from the catalog?')) {
                          removeFromCatalogMutation.mutate(item.itemId)
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Purchased Items</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {statsLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : !stats?.topItems?.length ? (
              <div className="p-6 text-center text-gray-500">
                <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>No purchase history yet</p>
              </div>
            ) : (
              stats.topItems.map((item, index) => (
                <div key={item.itemId} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <Link
                        href={`/dashboard/vendors/catalog/${item.itemId}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {item.itemName}
                      </Link>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{format(item.value)}</p>
                    <p className="text-xs text-gray-500">{item.quantity} units</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Purchases</h3>
        </div>
        <div className="overflow-x-auto">
          {statsLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : !stats?.recentPurchases?.length ? (
            <div className="p-6 text-center text-gray-500">
              <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>No purchases recorded from this vendor yet</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{purchase.itemName}</div>
                      <div className="text-xs text-gray-500">{purchase.itemCategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/projects/${purchase.projectId}`}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        {purchase.projectName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {purchase.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {format(purchase.unitCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {format(purchase.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Item to Catalog</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addToMutation.mutate(addItemForm)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procurement Item *
                </label>
                <select
                  value={addItemForm.itemId}
                  onChange={(e) => setAddItemForm({ ...addItemForm, itemId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="">Select an item</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </option>
                  ))}
                </select>
                {availableItems.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    All items are already in the catalog
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addItemForm.unitPrice}
                    onChange={(e) => setAddItemForm({ ...addItemForm, unitPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addItemForm.minQuantity}
                    onChange={(e) => setAddItemForm({ ...addItemForm, minQuantity: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    value={addItemForm.leadTimeDays}
                    onChange={(e) => setAddItemForm({ ...addItemForm, leadTimeDays: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor SKU
                  </label>
                  <input
                    type="text"
                    value={addItemForm.vendorSku}
                    onChange={(e) => setAddItemForm({ ...addItemForm, vendorSku: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={addItemForm.notes}
                  onChange={(e) => setAddItemForm({ ...addItemForm, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addToMutation.isPending || !addItemForm.itemId || !addItemForm.unitPrice}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {addToMutation.isPending ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
