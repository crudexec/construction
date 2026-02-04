'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ShoppingCart,
  Search,
  Package,
  DollarSign,
  BarChart3,
  ChevronRight,
  Tag,
  Filter
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface ProcurementItem {
  id: string
  name: string
  description: string | null
  category: string
  unit: string
  defaultCost: number | null
  sku: string | null
  photos: string | null
  isActive: boolean
  inventoryEntries: {
    id: string
    purchasedQty: number
    usedQty: number
    projectId: string
  }[]
  priceComparisons: {
    id: string
    unitPrice: number
    vendor: {
      id: string
      name: string
      companyName: string
    }
  }[]
}

export function CatalogTab() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)
  const { format: formatCurrency } = useCurrency()

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-items', selectedCategory, search, showInactive],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const params = new URLSearchParams()
      if (selectedCategory) params.append('category', selectedCategory)
      if (search) params.append('search', search)
      params.append('activeOnly', (!showInactive).toString())

      const response = await fetch(`/api/procurement/items?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch items')
      return response.json()
    }
  })

  const items: ProcurementItem[] = data?.items || []
  const categories: string[] = data?.categories || []

  // Calculate stats
  const totalItems = items.length
  const totalInUse = items.reduce((sum, item) => {
    return sum + item.inventoryEntries.reduce((s, e) => s + (e.purchasedQty > 0 ? 1 : 0), 0)
  }, 0)
  const avgPriceCompare = items.reduce((sum, item) => sum + item.priceComparisons.length, 0) / (items.length || 1)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-semibold">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Use (Projects)</p>
              <p className="text-xl font-semibold">{totalInUse}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-xl font-semibold">{categories.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Price Options</p>
              <p className="text-xl font-semibold">{avgPriceCompare.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show Inactive</span>
          </label>
        </div>
      </div>

      {/* Item List */}
      {isLoading ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
          <p className="text-gray-500">
            {search || selectedCategory
              ? 'Try adjusting your filters'
              : 'Get started by adding your first procurement item'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const totalStock = item.inventoryEntries.reduce(
              (sum, e) => sum + (e.purchasedQty - e.usedQty), 0
            )
            const lowestPrice = item.priceComparisons[0]?.unitPrice
            const photos = item.photos ? JSON.parse(item.photos) : []

            return (
              <Link
                key={item.id}
                href={`/dashboard/vendors/catalog/${item.id}`}
                className="bg-white rounded-lg shadow-sm border hover:border-primary-500 transition-colors group"
              >
                {/* Photo or placeholder */}
                <div className="h-32 bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                  {photos.length > 0 ? (
                    <img src={photos[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-gray-300" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate group-hover:text-primary-600">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{item.category}</p>
                    </div>
                    {!item.isActive && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  {item.sku && (
                    <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      {lowestPrice !== undefined ? (
                        <span>{formatCurrency(lowestPrice)}/{item.unit}</span>
                      ) : item.defaultCost !== null ? (
                        <span>{formatCurrency(item.defaultCost)}/{item.unit}</span>
                      ) : (
                        <span className="text-gray-400">No price</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>
                        {totalStock.toFixed(0)} {item.unit} in stock
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {item.inventoryEntries.length} project(s)
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {item.priceComparisons.length} vendor(s)
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
