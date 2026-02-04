'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  Building2,
  TrendingUp,
  BarChart3,
  History,
  AlertTriangle,
  Save,
  X,
  Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface PriceComparison {
  id: string
  unitPrice: number
  minQuantity: number | null
  validFrom: string | null
  validUntil: string | null
  notes: string | null
  isPreferred: boolean
  leadTimeDays: number | null
  vendorSku: string | null
  totalPurchasedQty: number
  totalPurchasedValue: number
  vendor: {
    id: string
    name: string
    companyName: string
    phone: string | null
    email: string | null
    status: string
  }
}

export default function ProcurementItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'inventory'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<{
    name: string
    description: string
    category: string
    unit: string
    defaultCost: string
    sku: string
    complianceInfo: string
  }>({ name: '', description: '', category: '', unit: '', defaultCost: '', sku: '', complianceInfo: '' })
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [newPrice, setNewPrice] = useState({
    vendorId: '',
    unitPrice: '',
    minQuantity: '',
    validUntil: '',
    notes: ''
  })

  const { data: item, isLoading } = useQuery({
    queryKey: ['procurement-item', id],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch item')
      return response.json()
    }
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/vendors', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch vendors')
      return response.json()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-item', id] })
      toast.success('Item updated successfully')
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete item')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Item deleted')
      router.push('/dashboard/vendors?tab=catalog')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const addPriceMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${id}/prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to add price')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-item', id] })
      toast.success('Price added successfully')
      setShowAddPrice(false)
      setNewPrice({ vendorId: '', unitPrice: '', minQuantity: '', validUntil: '', notes: '' })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deletePriceMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/prices/${priceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to delete price')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-item', id] })
      toast.success('Price removed')
    },
    onError: () => {
      toast.error('Failed to remove price')
    }
  })

  const setPreferredVendorMutation = useMutation({
    mutationFn: async (vendorId: string | null) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/procurement/items/${id}/preferred-vendor`, {
        method: vendorId ? 'PUT' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: vendorId ? JSON.stringify({ vendorId }) : undefined
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update preferred vendor')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-item', id] })
      toast.success('Preferred vendor updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleStartEdit = () => {
    if (item) {
      setEditForm({
        name: item.name,
        description: item.description || '',
        category: item.category,
        unit: item.unit,
        defaultCost: item.defaultCost?.toString() || '',
        sku: item.sku || '',
        complianceInfo: item.complianceInfo || ''
      })
      setIsEditing(true)
    }
  }

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description || null,
      category: editForm.category,
      unit: editForm.unit,
      defaultCost: editForm.defaultCost ? parseFloat(editForm.defaultCost) : null,
      sku: editForm.sku || null,
      complianceInfo: editForm.complianceInfo || null
    })
  }

  const handleAddPrice = () => {
    if (!newPrice.vendorId || !newPrice.unitPrice) {
      toast.error('Vendor and price are required')
      return
    }
    addPriceMutation.mutate({
      vendorId: newPrice.vendorId,
      unitPrice: parseFloat(newPrice.unitPrice),
      minQuantity: newPrice.minQuantity ? parseFloat(newPrice.minQuantity) : null,
      validUntil: newPrice.validUntil || null,
      notes: newPrice.notes || null
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Item not found</h2>
        <Link href="/dashboard/vendors?tab=catalog" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Catalog
        </Link>
      </div>
    )
  }

  const photos = item.photos ? JSON.parse(item.photos) : []
  const totalStock = item.inventoryEntries?.reduce(
    (sum: number, e: { purchasedQty: number; usedQty: number }) => sum + (e.purchasedQty - e.usedQty), 0
  ) || 0
  const lowestPrice = item.priceComparisons?.[0]?.unitPrice
  const priceRange = item.priceComparisons?.length > 1
    ? `${formatCurrency(item.priceComparisons[item.priceComparisons.length - 1].unitPrice)} - ${formatCurrency(item.priceComparisons[0].unitPrice)}`
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/vendors?tab=catalog"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600">{item.category} • {item.unit}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this item?')) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Stock</p>
              <p className="text-xl font-semibold">{totalStock.toFixed(0)} {item.unit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Best Price</p>
              <p className="text-xl font-semibold">
                {lowestPrice !== undefined ? formatCurrency(lowestPrice) : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Projects Using</p>
              <p className="text-xl font-semibold">{item.inventoryEntries?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendors</p>
              <p className="text-xl font-semibold">{item.priceComparisons?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {['overview', 'prices', 'inventory'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Edit Item</h3>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                      <input
                        type="text"
                        value={editForm.unit}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Cost</label>
                      <input
                        type="number"
                        value={editForm.defaultCost}
                        onChange={(e) => setEditForm({ ...editForm, defaultCost: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Info</label>
                    <textarea
                      value={editForm.complianceInfo}
                      onChange={(e) => setEditForm({ ...editForm, complianceInfo: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Item Details</h3>
                <dl className="space-y-4">
                  {item.sku && (
                    <div>
                      <dt className="text-sm text-gray-500">SKU</dt>
                      <dd className="text-gray-900">{item.sku}</dd>
                    </div>
                  )}
                  {item.description && (
                    <div>
                      <dt className="text-sm text-gray-500">Description</dt>
                      <dd className="text-gray-900">{item.description}</dd>
                    </div>
                  )}
                  {item.defaultCost !== null && (
                    <div>
                      <dt className="text-sm text-gray-500">Default Cost</dt>
                      <dd className="text-gray-900">${item.defaultCost.toFixed(2)} per {item.unit}</dd>
                    </div>
                  )}
                  {priceRange && (
                    <div>
                      <dt className="text-sm text-gray-500">Price Range</dt>
                      <dd className="text-gray-900">{priceRange} per {item.unit}</dd>
                    </div>
                  )}
                  {item.complianceInfo && (
                    <div>
                      <dt className="text-sm text-gray-500">Compliance Info</dt>
                      <dd className="text-gray-900">{item.complianceInfo}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Preferred Vendor */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="h-5 w-5 text-yellow-500 mr-2" />
              Preferred Vendor
            </h3>
            {item.preferredVendor ? (
              <div>
                <Link
                  href={`/dashboard/vendors/${item.preferredVendor.id}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {item.preferredVendor.companyName || item.preferredVendor.name}
                </Link>
                {item.preferredVendor.email && (
                  <p className="text-sm text-gray-500 mt-1">{item.preferredVendor.email}</p>
                )}
                {item.preferredVendor.phone && (
                  <p className="text-sm text-gray-500">{item.preferredVendor.phone}</p>
                )}
                <button
                  onClick={() => setPreferredVendorMutation.mutate(null)}
                  disabled={setPreferredVendorMutation.isPending}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  Remove preferred vendor
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm mb-3">No preferred vendor set</p>
                {item.priceComparisons?.length > 0 && (
                  <p className="text-xs text-gray-400">
                    Set a preferred vendor in the Prices tab
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Photos</h3>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo: string, i: number) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`${item.name} ${i + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No photos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Price Comparisons</h3>
            <button
              onClick={() => setShowAddPrice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Price
            </button>
          </div>

          {showAddPrice && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <select
                    value={newPrice.vendorId}
                    onChange={(e) => setNewPrice({ ...newPrice, vendorId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select vendor</option>
                    {vendors?.map((v: { id: string; name: string; companyName: string }) => (
                      <option key={v.id} value={v.id}>{v.companyName || v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
                  <input
                    type="number"
                    value={newPrice.unitPrice}
                    onChange={(e) => setNewPrice({ ...newPrice, unitPrice: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Qty</label>
                  <input
                    type="number"
                    value={newPrice.minQuantity}
                    onChange={(e) => setNewPrice({ ...newPrice, minQuantity: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={newPrice.validUntil}
                    onChange={(e) => setNewPrice({ ...newPrice, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAddPrice}
                    disabled={addPriceMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddPrice(false)}
                    className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {item.priceComparisons?.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min. Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {item.priceComparisons.map((price: PriceComparison, index: number) => {
                    const isExpired = price.validUntil && new Date(price.validUntil) < new Date()
                    const isBest = index === 0
                    const isPreferred = price.isPreferred || item.preferredVendorId === price.vendor.id

                    return (
                      <tr key={price.id} className={isPreferred ? 'bg-yellow-50' : isBest ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/vendors/${price.vendor.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600"
                            >
                              {price.vendor.companyName || price.vendor.name}
                            </Link>
                            {isPreferred && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                <Star className="h-3 w-3 mr-1" />
                                Preferred
                              </span>
                            )}
                          </div>
                          {price.vendor.email && (
                            <div className="text-sm text-gray-500">{price.vendor.email}</div>
                          )}
                          {price.vendorSku && (
                            <div className="text-xs text-gray-400">SKU: {price.vendorSku}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">${price.unitPrice.toFixed(2)}</span>
                            {isBest && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Best
                              </span>
                            )}
                          </div>
                          {price.totalPurchasedQty > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              {price.totalPurchasedQty.toFixed(0)} {item.unit} purchased
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {price.minQuantity ? `${price.minQuantity} ${item.unit}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {price.leadTimeDays ? `${price.leadTimeDays} days` : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {price.validUntil
                            ? new Date(price.validUntil).toLocaleDateString()
                            : 'No expiry'}
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="flex items-center gap-1 text-orange-600 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              Expired
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {!isPreferred && (
                              <button
                                onClick={() => setPreferredVendorMutation.mutate(price.vendor.id)}
                                disabled={setPreferredVendorMutation.isPending}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Set as preferred vendor"
                              >
                                <Star className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm('Remove this price?')) {
                                  deletePriceMutation.mutate(price.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No price comparisons yet</p>
              <p className="text-sm text-gray-400 mt-1">Add vendor prices to compare options</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Project Inventory</h3>

          {item.inventoryEntries?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.inventoryEntries.map((entry: {
                id: string
                purchasedQty: number
                usedQty: number
                minStockLevel: number | null
                project: { id: string; title: string }
                purchases: { totalCost: number }[]
              }) => {
                const remaining = entry.purchasedQty - entry.usedQty
                const isLowStock = entry.minStockLevel !== null && remaining <= entry.minStockLevel

                return (
                  <Link
                    key={entry.id}
                    href={`/dashboard/projects/${entry.project.id}?tab=inventory`}
                    className="bg-white p-4 rounded-lg shadow-sm border hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{entry.project.title}</h4>
                      {isLowStock && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Purchased</p>
                        <p className="font-semibold">{entry.purchasedQty.toFixed(0)} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Used</p>
                        <p className="font-semibold">{entry.usedQty.toFixed(0)} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Remaining</p>
                        <p className={`font-semibold ${isLowStock ? 'text-red-600' : ''}`}>
                          {remaining.toFixed(0)} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Total spent: ${entry.purchases.reduce((s, p) => s + p.totalCost, 0).toFixed(2)}
                      </span>
                      <span className="text-primary-600 flex items-center gap-1">
                        View History
                        <History className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">This item is not used in any projects yet</p>
              <p className="text-sm text-gray-400 mt-1">Add it to a project&apos;s inventory to start tracking</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
