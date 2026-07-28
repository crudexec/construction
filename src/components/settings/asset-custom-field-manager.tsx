'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, ListChecks, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface AssetCustomFieldDefinition {
  id: string
  name: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
  selectOptions: string[]
  isActive: boolean
  sortOrder: number
  valueCount: number
}

interface FieldFormData {
  name: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
  selectOptionsText: string
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  BOOLEAN: 'Yes/No',
  SELECT: 'Dropdown'
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchFields() {
  const response = await fetch('/api/asset-custom-fields?includeInactive=true', {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch custom fields')
  return response.json()
}

async function createField(data: { name: string; fieldType: string; selectOptions: string[] }) {
  const response = await fetch('/api/asset-custom-fields', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create custom field')
  return result
}

async function updateField(id: string, data: Partial<{ name: string; fieldType: string; selectOptions: string[] }>) {
  const response = await fetch(`/api/asset-custom-fields/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update custom field')
  return result
}

async function deleteField(id: string) {
  const response = await fetch(`/api/asset-custom-fields/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Cookie': document.cookie
    }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete custom field')
  return result
}

function FieldForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  initialData?: Partial<FieldFormData>
  onSubmit: (data: FieldFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState<FieldFormData>({
    name: initialData?.name || '',
    fieldType: initialData?.fieldType || 'TEXT',
    selectOptionsText: initialData?.selectOptionsText || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Field name is required')
      return
    }
    if (formData.fieldType === 'SELECT' && !formData.selectOptionsText.trim()) {
      toast.error('Dropdown fields need at least one option')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Field Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., Fuel Type"
        />
      </div>

      <div>
        <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">
          Field Type *
        </label>
        <select
          id="fieldType"
          value={formData.fieldType}
          onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as FieldFormData['fieldType'] })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {formData.fieldType === 'SELECT' && (
        <div>
          <label htmlFor="selectOptions" className="block text-sm font-medium text-gray-700">
            Options *
          </label>
          <textarea
            id="selectOptions"
            value={formData.selectOptionsText}
            onChange={(e) => setFormData({ ...formData, selectOptionsText: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="One option per line, e.g.&#10;Diesel&#10;Gasoline&#10;Electric"
          />
        </div>
      )}

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
          {isSubmitting ? 'Saving...' : initialData?.name ? 'Update Field' : 'Add Field'}
        </button>
      </div>
    </form>
  )
}

export function AssetCustomFieldManager() {
  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState<AssetCustomFieldDefinition | null>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: fields, isLoading } = useQuery<AssetCustomFieldDefinition[]>({
    queryKey: ['asset-custom-fields'],
    queryFn: fetchFields
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['asset-custom-fields'] })

  const createMutation = useMutation({
    mutationFn: createField,
    onSuccess: () => {
      toast.success('Custom field created')
      invalidate()
      setShowModal(false)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; fieldType: string; selectOptions: string[] }> }) =>
      updateField(id, data),
    onSuccess: () => {
      toast.success('Custom field updated')
      invalidate()
      setEditingField(null)
      setShowModal(false)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => {
      toast.success('Custom field deleted')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleSubmit = (formData: FieldFormData) => {
    const selectOptions = formData.fieldType === 'SELECT'
      ? formData.selectOptionsText.split('\n').map(o => o.trim()).filter(Boolean)
      : []

    const data = { name: formData.name.trim(), fieldType: formData.fieldType, selectOptions }

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (field: AssetCustomFieldDefinition) => {
    if (field.valueCount > 0) {
      toast.error(`Cannot delete a field with ${field.valueCount} asset value(s) set. Deactivate it instead.`)
      return
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${field.name}"?`,
      'Delete Custom Field'
    )
    if (confirmed) {
      deleteMutation.mutate(field.id)
    }
  }

  const handleEdit = (field: AssetCustomFieldDefinition) => {
    setEditingField(field)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingField(null)
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
          <h3 className="text-lg font-medium text-gray-900">Asset Custom Fields</h3>
          <p className="text-sm text-gray-500">
            Define extra fields to track on equipment and vehicles, beyond the built-in ones
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </button>
      </div>

      {fields && fields.length > 0 ? (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets Using</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field) => (
                <tr key={field.id} className={`hover:bg-gray-50 ${!field.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{field.name}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{FIELD_TYPE_LABELS[field.fieldType]}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-500 line-clamp-1">
                      {field.selectOptions.length > 0 ? field.selectOptions.join(', ') : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <ListChecks className="h-3 w-3 mr-1" />
                      {field.valueCount}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => handleEdit(field)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(field)}
                        className={`p-1.5 rounded ${
                          field.valueCount > 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={field.valueCount > 0 ? 'Cannot delete - in use' : 'Delete'}
                        disabled={field.valueCount > 0}
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
          <ListChecks className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Custom Fields Yet</h4>
          <p className="text-gray-600 mb-4">
            Add fields to track extra details specific to your equipment and vehicles
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Field
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FieldForm
              initialData={editingField ? {
                name: editingField.name,
                fieldType: editingField.fieldType,
                selectOptionsText: editingField.selectOptions.join('\n')
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
