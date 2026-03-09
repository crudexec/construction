'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Tag, X, Filter, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface FileTag {
  id: string
  name: string
  description: string | null
  color: string
  category: string | null
  isActive: boolean
  documentCount: number
}

interface TagFormData {
  name: string
  description: string
  color: string
  category: string
}

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#14b8a6', '#8b5cf6',
  '#ec4899', '#ef4444', '#eab308', '#84cc16', '#0ea5e9',
  '#6366f1', '#64748b', '#78716c', '#a16207', '#dc2626'
]

const TAG_CATEGORIES = [
  'Document Type',
  'Status',
  'Priority',
  'Department',
  'Other'
]

async function fetchTags() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/file-tags?includeInactive=true', {
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

  const response = await fetch('/api/file-tags', {
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

  const response = await fetch(`/api/file-tags/${id}`, {
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

  const response = await fetch(`/api/file-tags/${id}`, {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-gray-700">
          Tag Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., Contract, Invoice"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-xs font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">No Category</option>
          {TAG_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Brief description of this tag"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Color
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                formData.color === color
                  ? 'border-gray-900 scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-6 w-10 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-[10px] text-gray-500">Custom color</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData?.name ? 'Update' : 'Add Tag'}
        </button>
      </div>
    </form>
  )
}

export function FileTagManager() {
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<FileTag | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: tags, isLoading } = useQuery<FileTag[]>({
    queryKey: ['file-tags'],
    queryFn: fetchTags
  })

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      toast.success('Tag created successfully')
      queryClient.invalidateQueries({ queryKey: ['file-tags'] })
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
      queryClient.invalidateQueries({ queryKey: ['file-tags'] })
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
      queryClient.invalidateQueries({ queryKey: ['file-tags'] })
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

  const handleDelete = async (tag: FileTag) => {
    if (tag.documentCount > 0) {
      toast.error(`Cannot delete tag with ${tag.documentCount} file(s) assigned. Remove from files first.`)
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

  const handleEdit = (tag: FileTag) => {
    setEditingTag(tag)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTag(null)
  }

  const toggleActive = (tag: FileTag) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded border overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">File Tags ({tags?.length || 0})</h3>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Tag
          </button>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <Filter className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600">Filter:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tags Table */}
        {filteredTags.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Tag</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase">Files</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTags.map((tag, idx) => (
                  <tr
                    key={tag.id}
                    className={`${!tag.isActive ? 'opacity-50' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-xs font-medium text-gray-900">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-xs text-gray-500">{tag.category || '-'}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-xs text-gray-500 line-clamp-1">{tag.description || '-'}</span>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className="text-xs text-gray-500">{tag.documentCount}</span>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => toggleActive(tag)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          tag.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          onClick={() => handleEdit(tag)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag)}
                          className={`p-1 rounded ${
                            tag.documentCount > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={tag.documentCount > 0 ? 'Cannot delete - has files' : 'Delete'}
                          disabled={tag.documentCount > 0}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-6 w-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-2">No file tags yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              + Create First Tag
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-sm w-full mx-4">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">
                {editingTag ? 'Edit File Tag' : 'Add File Tag'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
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
        </div>
      )}
    </div>
  )
}
