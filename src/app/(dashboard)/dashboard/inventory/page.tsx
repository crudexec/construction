'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Search,
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
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex justify-between items-center py-1">
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-gray-500" />
          <h1 className="text-sm font-medium text-gray-900">Inventory</h1>
          <span className="text-xs text-gray-500">({materials.length} items)</span>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 flex items-center space-x-1"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Compact Stats Bar */}
      <div className="bg-white border border-gray-200 rounded flex divide-x divide-gray-200">
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-blue-600" />
          <div>
            <div className="text-[10px] text-gray-500">Items</div>
            <div className="text-xs font-semibold text-gray-900">{materials.length}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
          <div>
            <div className="text-[10px] text-gray-500">Total Value</div>
            <div className="text-xs font-semibold text-gray-900">{formatCurrency(totalValue)}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className={`h-3.5 w-3.5 ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          <div>
            <div className="text-[10px] text-gray-500">Low Stock</div>
            <div className={`text-xs font-semibold ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{lowStockItems.length}</div>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="flex items-center gap-2 p-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-6 pr-2 py-1 w-full text-xs border border-gray-200 rounded focus:border-primary-500 focus:outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        {materialsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Package className="h-8 w-8 mb-2 text-gray-300" />
            <p className="text-xs font-medium">No materials found</p>
            <p className="text-[10px]">Add your first material to get started</p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Material</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Category</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Total</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id} className={`border-b border-gray-100 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-2 py-1.5">
                    <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{material.name}</div>
                    {material.description && (
                      <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{material.description}</div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {material.category ? (
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${material.category.color}20`,
                          color: material.category.color
                        }}
                      >
                        {material.category.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-600">
                    {material.sku || '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-xs font-medium ${material.quantity <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {material.quantity} {material.unit}
                    </span>
                    {material.quantity <= 5 && (
                      <span className="ml-1 text-[9px] text-amber-600">Low</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs text-gray-600">
                    {formatCurrency(material.unitCost)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs font-medium text-gray-900">
                    {formatCurrency(material.quantity * material.unitCost)}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => setStockModalData({ material, type: 'in' })}
                        className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                        title="Stock In"
                      >
                        <ArrowUpCircle className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setStockModalData({ material, type: 'out' })}
                        className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                        title="Stock Out"
                      >
                        <ArrowDownCircle className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setHistoryMaterial(material)}
                        className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="History"
                      >
                        <History className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setEditingMaterial(material)}
                        className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(material.id)}
                        className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <div className="relative bg-white rounded-lg p-4 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Material</h3>
            <p className="text-xs text-gray-600 mb-3">
              Are you sure you want to delete this material? This will also delete all transaction history.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
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
