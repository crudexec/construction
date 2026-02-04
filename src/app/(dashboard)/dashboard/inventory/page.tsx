'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit2,
  Trash2,
  History,
  AlertTriangle
} from 'lucide-react'
import { AddMaterialModal } from '@/components/inventory/add-material-modal'
import { StockModal } from '@/components/inventory/stock-modal'
import { TransactionHistoryModal } from '@/components/inventory/transaction-history-modal'
import { useCurrency } from '@/hooks/useCurrency'

interface Category {
  id: string
  name: string
  color: string
  _count: { materials: number }
}

interface Material {
  id: string
  name: string
  sku: string | null
  description: string | null
  unit: string
  quantity: number
  unitCost: number
  category: {
    id: string
    name: string
    color: string
  } | null
  _count: { transactions: number }
  createdAt: string
}

async function fetchMaterials(categoryId?: string, search?: string) {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  if (search) params.set('search', search)

  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/inventory?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch inventory')
  return response.json()
}

async function fetchCategories() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/inventory/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function deleteMaterial(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/inventory/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete material')
  return response.json()
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [stockModalData, setStockModalData] = useState<{ material: Material; type: 'in' | 'out' } | null>(null)
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: materials = [], isLoading: materialsLoading } = useQuery<Material[]>({
    queryKey: ['inventory', selectedCategory, searchTerm],
    queryFn: () => fetchMaterials(selectedCategory || undefined, searchTerm || undefined)
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['inventory-categories'],
    queryFn: fetchCategories
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDeleteConfirm(null)
    }
  })

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const totalValue = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0)
  const lowStockItems = materials.filter(m => m.quantity <= 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your materials and stock levels
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{materials.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-5 w-5 ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-xl font-bold text-gray-900">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or description..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {materialsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="h-12 w-12 mb-4 text-gray-300" />
            <p className="font-medium">No materials found</p>
            <p className="text-sm">Add your first material to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{material.name}</p>
                        {material.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{material.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {material.category ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${material.category.color}20`,
                            color: material.category.color
                          }}
                        >
                          {material.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {material.sku || '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-medium ${material.quantity <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {material.quantity} {material.unit}
                      </span>
                      {material.quantity <= 5 && (
                        <span className="ml-2 text-xs text-amber-600">Low</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-600">
                      {formatCurrency(material.unitCost)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(material.quantity * material.unitCost)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setStockModalData({ material, type: 'in' })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Stock In"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setStockModalData({ material, type: 'out' })}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Stock Out"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setHistoryMaterial(material)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingMaterial(material)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(material.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Material Modal */}
      {(isAddModalOpen || editingMaterial) && (
        <AddMaterialModal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingMaterial(null)
          }}
          material={editingMaterial}
          categories={categories}
        />
      )}

      {/* Stock In/Out Modal */}
      {stockModalData && (
        <StockModal
          isOpen={true}
          onClose={() => setStockModalData(null)}
          material={stockModalData.material}
          type={stockModalData.type}
        />
      )}

      {/* Transaction History Modal */}
      {historyMaterial && (
        <TransactionHistoryModal
          isOpen={true}
          onClose={() => setHistoryMaterial(null)}
          material={historyMaterial}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Material</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this material? This will also delete all transaction history.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
