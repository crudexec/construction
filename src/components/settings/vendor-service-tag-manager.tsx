'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Tag, X, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface VendorServiceTag {
  id: string
  name: string
  description: string | null
  color: string
  category: string | null
  isActive: boolean
  vendorCount: number
}

interface TagFormData {
  name: string
  description: string
  color: string
  category: string
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#64748b', '#78716c', '#a16207'
]

const TAG_CATEGORIES = [
  'Trade',
  'Service Type',
  'Market Segment',
  'Certification',
  'Capability',
  'Other'
]

async function fetchTags() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-tags?includeInactive=true', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch tags')
  return response.json()
}

async function createTag(data: TagFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create tag')
  return result
}

async function updateTag(id: string, data: Partial<TagFormData & { isActive: boolean }>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-tags/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update tag')
  return result
}

async function deleteTag(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-tags/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete tag')
  return result
}

function TagForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  initialData?: Partial<TagFormData>
  onSubmit: (data: TagFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState<TagFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || DEFAULT_COLORS[0],
    category: initialData?.category || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Tag Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., New Construction"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">No Category</option>
          {TAG_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Group related tags together for easier filtering
        </p>
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
          placeholder="Brief description of this service tag"
        />
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
          {isSubmitting ? 'Saving...' : initialData?.name ? 'Update Tag' : 'Add Tag'}
        </button>
      </div>
    </form>
  )
}

export function VendorServiceTagManager() {
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<VendorServiceTag | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: tags, isLoading } = useQuery<VendorServiceTag[]>({
    queryKey: ['vendor-service-tags'],
    queryFn: fetchTags
  })

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      toast.success('Tag created successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-service-tags'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-tags'] })
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TagFormData & { isActive: boolean }> }) =>
      updateTag(id, data),
    onSuccess: () => {
      toast.success('Tag updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-service-tags'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-tags'] })
      setEditingTag(null)
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      toast.success('Tag deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['vendor-service-tags'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-tags'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (data: TagFormData) => {
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (tag: VendorServiceTag) => {
    if (tag.vendorCount > 0) {
      toast.error(`Cannot delete tag with ${tag.vendorCount} assigned vendor(s). Remove from vendors first.`)
      return
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${tag.name}"?`,
      'Delete Tag'
    )
    if (confirmed) {
      deleteMutation.mutate(tag.id)
    }
  }

  const handleEdit = (tag: VendorServiceTag) => {
    setEditingTag(tag)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTag(null)
  }

  const toggleActive = (tag: VendorServiceTag) => {
    updateMutation.mutate({
      id: tag.id,
      data: { isActive: !tag.isActive }
    })
  }

  // Get unique categories from tags
  const categories = tags
    ? [...new Set(tags.map(t => t.category).filter(Boolean))]
    : []

  // Filter tags by category
  const filteredTags = tags?.filter(tag =>
    filterCategory === 'all' || tag.category === filterCategory
  ) || []

  // Group tags by category
  const groupedTags = filteredTags.reduce((acc, tag) => {
    const cat = tag.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {} as Record<string, VendorServiceTag[]>)

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
          <h3 className="text-lg font-medium text-gray-900">Vendor Service Tags</h3>
          <p className="text-sm text-gray-500">
            Create tags to classify vendor services (e.g., &quot;New Construction&quot;, &quot;Residential&quot;, &quot;Commercial&quot;)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </button>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-4 flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filter:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {filteredTags.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTags).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTags]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                {category} ({categoryTags.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`border rounded-lg p-3 hover:shadow-md transition-shadow ${
                      !tag.isActive ? 'opacity-50 bg-gray-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-gray-900">{tag.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEdit(tag)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag)}
                          className={`p-1 rounded ${
                            tag.vendorCount > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={tag.vendorCount > 0 ? 'Cannot delete - has vendors' : 'Delete'}
                          disabled={tag.vendorCount > 0}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {tag.description && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {tag.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {tag.vendorCount} vendor{tag.vendorCount !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => toggleActive(tag)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          tag.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Service Tags Yet</h4>
          <p className="text-gray-600 mb-4">
            Create service tags to classify your vendors by capability
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Tag
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTag ? 'Edit Service Tag' : 'Add Service Tag'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <TagForm
              initialData={editingTag ? {
                name: editingTag.name,
                description: editingTag.description || '',
                color: editingTag.color,
                category: editingTag.category || ''
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
