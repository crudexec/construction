'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface VendorCategory {
  id: string
  name: string
  description: string | null
  color: string
  csiDivision: string | null
  sortOrder: number
  isActive: boolean
  vendorCount: number
}

interface CategoryFormData {
  name: string
  description: string
  color: string
  csiDivision: string
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#64748b', '#78716c', '#a16207'
]

async function fetchCategories() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function createCategory(data: CategoryFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create category')
  return result
}

async function updateCategory(id: string, data: Partial<CategoryFormData>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update category')
  return result
}

async function deleteCategory(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete category')
  return result
}

function CategoryForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  initialData?: Partial<CategoryFormData>
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || DEFAULT_COLORS[0],
    csiDivision: initialData?.csiDivision || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., Electrical"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Brief description of this vendor category"
        />
      </div>

      <div>
        <label htmlFor="csiDivision" className="block text-sm font-medium text-gray-700">
          CSI Division Code
        </label>
        <input
          id="csiDivision"
          type="text"
          value={formData.csiDivision}
          onChange={(e) => setFormData({ ...formData, csiDivision: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., 16 for Electrical"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional CSI MasterFormat division code for standardization
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === color
                  ? 'border-gray-900 scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-8 w-12 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">Or pick a custom color</span>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData?.name ? 'Update Category' : 'Add Category'}
        </button>
      </div>
    </form>
  )
}

export function VendorCategoryManager() {
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: categories, isLoading } = useQuery<VendorCategory[]>({
    queryKey: ['vendor-categories'],
    queryFn: fetchCategories
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] })
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
      updateCategory(id, data),
    onSuccess: () => {
      toast.success('Category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] })
      setEditingCategory(null)
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (category: VendorCategory) => {
    if (category.vendorCount > 0) {
      toast.error(`Cannot delete category with ${category.vendorCount} assigned vendor(s). Reassign vendors first.`)
      return
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${category.name}"?`,
      'Delete Category'
    )
    if (confirmed) {
      deleteMutation.mutate(category.id)
    }
  }

  const handleEdit = (category: VendorCategory) => {
    setEditingCategory(category)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCategory(null)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Vendor Categories</h3>
          <p className="text-sm text-gray-500">
            Manage categories for organizing your vendors by trade or specialty
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    {category.csiDivision && (
                      <span className="text-xs text-gray-500">
                        CSI Division {category.csiDivision}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className={`p-1.5 rounded ${
                      category.vendorCount > 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={category.vendorCount > 0 ? 'Cannot delete - has vendors' : 'Delete'}
                    disabled={category.vendorCount > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {category.description}
                </p>
              )}
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <Tag className="h-3 w-3 mr-1" />
                {category.vendorCount} vendor{category.vendorCount !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Categories Yet</h4>
          <p className="text-gray-600 mb-4">
            Create vendor categories to organize your vendors by trade or specialty
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Category
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <CategoryForm
              initialData={editingCategory ? {
                name: editingCategory.name,
                description: editingCategory.description || '',
                color: editingCategory.color,
                csiDivision: editingCategory.csiDivision || ''
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
