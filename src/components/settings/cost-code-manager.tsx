'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Hash, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'
import { CostCodeImportModal } from '@/components/settings/cost-code-import-modal'

interface CostCode {
  id: string
  code: string
  name: string
  description: string | null
  csiDivision: string | null
  sortOrder: number
  isActive: boolean
  boqItemCount: number
}

interface CostCodeFormData {
  code: string
  name: string
  description: string
  csiDivision: string
}

async function fetchCostCodes() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/cost-codes?includeInactive=true', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch cost codes')
  return response.json()
}

async function createCostCode(data: CostCodeFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/cost-codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create cost code')
  return result
}

async function updateCostCode(id: string, data: Partial<CostCodeFormData>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/cost-codes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update cost code')
  return result
}

async function deleteCostCode(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/cost-codes/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete cost code')
  return result
}

function CostCodeForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  initialData?: Partial<CostCodeFormData>
  onSubmit: (data: CostCodeFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState<CostCodeFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    csiDivision: initialData?.csiDivision || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      toast.error('Cost code is required')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Cost code name is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code *
        </label>
        <input
          id="code"
          type="text"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., 03 30 00"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., Cast-in-Place Concrete"
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
          placeholder="Brief description of this cost code"
        />
      </div>

      <div>
        <label htmlFor="csiDivision" className="block text-sm font-medium text-gray-700">
          CSI Division
        </label>
        <input
          id="csiDivision"
          type="text"
          value={formData.csiDivision}
          onChange={(e) => setFormData({ ...formData, csiDivision: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., 03 for Concrete"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional CSI MasterFormat division for grouping
        </p>
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
          {isSubmitting ? 'Saving...' : initialData?.code ? 'Update Cost Code' : 'Add Cost Code'}
        </button>
      </div>
    </form>
  )
}

export function CostCodeManager() {
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: costCodes, isLoading } = useQuery<CostCode[]>({
    queryKey: ['cost-codes'],
    queryFn: fetchCostCodes
  })

  const createMutation = useMutation({
    mutationFn: createCostCode,
    onSuccess: () => {
      toast.success('Cost code created successfully')
      queryClient.invalidateQueries({ queryKey: ['cost-codes'] })
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CostCodeFormData> }) =>
      updateCostCode(id, data),
    onSuccess: () => {
      toast.success('Cost code updated successfully')
      queryClient.invalidateQueries({ queryKey: ['cost-codes'] })
      setEditingCostCode(null)
      setShowModal(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCostCode,
    onSuccess: () => {
      toast.success('Cost code deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['cost-codes'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (data: CostCodeFormData) => {
    if (editingCostCode) {
      updateMutation.mutate({ id: editingCostCode.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (costCode: CostCode) => {
    if (costCode.boqItemCount > 0) {
      toast.error(`Cannot delete cost code with ${costCode.boqItemCount} assigned BOQ item(s). Reassign items first.`)
      return
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${costCode.code} — ${costCode.name}"?`,
      'Delete Cost Code'
    )
    if (confirmed) {
      deleteMutation.mutate(costCode.id)
    }
  }

  const handleEdit = (costCode: CostCode) => {
    setEditingCostCode(costCode)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCostCode(null)
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
          <h3 className="text-lg font-medium text-gray-900">Cost Codes</h3>
          <p className="text-sm text-gray-500">
            Manage the cost code directory used to classify BOQ items across your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Directory
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Code
          </button>
        </div>
      </div>

      {costCodes && costCodes.length > 0 ? (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CSI Division
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BOQ Items
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costCodes.map((costCode) => (
                <tr key={costCode.id} className={`hover:bg-gray-50 ${!costCode.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">{costCode.code}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{costCode.name}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-500 line-clamp-1">
                      {costCode.description || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {costCode.csiDivision || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Hash className="h-3 w-3 mr-1" />
                      {costCode.boqItemCount}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => handleEdit(costCode)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(costCode)}
                        className={`p-1.5 rounded ${
                          costCode.boqItemCount > 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={costCode.boqItemCount > 0 ? 'Cannot delete - has BOQ items' : 'Delete'}
                        disabled={costCode.boqItemCount > 0}
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
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Cost Codes Yet</h4>
          <p className="text-gray-600 mb-4">
            Import a cost code directory or add codes individually to start tagging BOQ items
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Directory
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Cost Code
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCostCode ? 'Edit Cost Code' : 'Add Cost Code'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <CostCodeForm
              initialData={editingCostCode ? {
                code: editingCostCode.code,
                name: editingCostCode.name,
                description: editingCostCode.description || '',
                csiDivision: editingCostCode.csiDivision || ''
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      <CostCodeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  )
}
