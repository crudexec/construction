'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Edit, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

type BaseAssetStatus = 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'

interface AssetStatusDefinition {
  id: string
  name: string
  baseStatus: BaseAssetStatus
  color?: string | null
  isActive: boolean
  sortOrder: number
  assetCount: number
}

interface AssetIssueNotificationSetting {
  notifyAdmins: boolean
  notifyStaff: boolean
  recipientUserIds: string[]
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive?: boolean
}

const BASE_STATUS_OPTIONS: Array<{ value: BaseAssetStatus; label: string }> = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST_DAMAGED', label: 'Lost/Damaged' },
]

const COLOR_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'red', label: 'Red' },
  { value: 'gray', label: 'Gray' },
  { value: 'purple', label: 'Purple' },
]

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchStatuses() {
  const response = await fetch('/api/asset-statuses?includeInactive=true', {
    headers: { Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
  })
  if (!response.ok) throw new Error('Failed to fetch asset statuses')
  return response.json()
}

async function fetchNotificationSetting() {
  const response = await fetch('/api/asset-issue-notification-settings', {
    headers: { Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
  })
  if (!response.ok) throw new Error('Failed to fetch asset issue notification settings')
  return response.json()
}

async function fetchUsers() {
  const response = await fetch('/api/users', {
    headers: { Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
  })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data) ? data : data.users || []
}

async function createStatus(data: { name: string; baseStatus: BaseAssetStatus; color: string }) {
  const response = await fetch('/api/asset-statuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to create asset status')
  return result
}

async function updateStatus(id: string, data: Partial<{ name: string; baseStatus: BaseAssetStatus; color: string; isActive: boolean }>) {
  const response = await fetch(`/api/asset-statuses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update asset status')
  return result
}

async function deleteStatus(id: string) {
  const response = await fetch(`/api/asset-statuses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete asset status')
  return result
}

async function updateNotificationSetting(data: AssetIssueNotificationSetting) {
  const response = await fetch('/api/asset-issue-notification-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Cookie: document.cookie },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update notification settings')
  return result
}

export function AssetStatusManager() {
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<AssetStatusDefinition | null>(null)
  const [form, setForm] = useState({ name: '', baseStatus: 'AVAILABLE' as BaseAssetStatus, color: '' })

  const { data: statuses = [], isLoading } = useQuery<AssetStatusDefinition[]>({
    queryKey: ['asset-statuses'],
    queryFn: fetchStatuses,
  })

  const { data: notificationSetting } = useQuery<AssetIssueNotificationSetting>({
    queryKey: ['asset-issue-notification-settings'],
    queryFn: fetchNotificationSetting,
  })

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['team-members'],
    queryFn: fetchUsers,
  })

  const invalidateStatuses = () => queryClient.invalidateQueries({ queryKey: ['asset-statuses'] })

  const createMutation = useMutation({
    mutationFn: createStatus,
    onSuccess: () => {
      toast.success('Asset status created')
      invalidateStatuses()
      closeModal()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; baseStatus: BaseAssetStatus; color: string; isActive: boolean }> }) => updateStatus(id, data),
    onSuccess: () => {
      toast.success('Asset status updated')
      invalidateStatuses()
      closeModal()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStatus,
    onSuccess: () => {
      toast.success('Asset status removed')
      invalidateStatuses()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const notificationMutation = useMutation({
    mutationFn: updateNotificationSetting,
    onSuccess: () => {
      toast.success('Asset issue notification settings updated')
      queryClient.invalidateQueries({ queryKey: ['asset-issue-notification-settings'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingStatus(null)
    setForm({ name: '', baseStatus: 'AVAILABLE', color: '' })
  }

  const openEdit = (status: AssetStatusDefinition) => {
    setEditingStatus(status)
    setForm({ name: status.name, baseStatus: status.baseStatus, color: status.color || '' })
    setIsModalOpen(true)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('Status name is required')
      return
    }

    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: form })
      return
    }

    createMutation.mutate(form)
  }

  const currentNotificationSetting = notificationSetting || { notifyAdmins: true, notifyStaff: false, recipientUserIds: [] }

  const updateNotificationField = (patch: Partial<AssetIssueNotificationSetting>) => {
    notificationMutation.mutate({
      ...currentNotificationSetting,
      ...patch,
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Asset Statuses</h3>
            <p className="text-xs text-gray-500">Create custom dropdown values while keeping the built-in status categories for filtering.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Status
          </button>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-gray-500">Loading statuses...</div>
        ) : statuses.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No custom asset statuses yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Base Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Color</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Assets</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">State</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {statuses.map((status) => (
                  <tr key={status.id} className={!status.isActive ? 'opacity-60' : ''}>
                    <td className="px-3 py-2 font-medium text-gray-900">{status.name}</td>
                    <td className="px-3 py-2 text-gray-600">{BASE_STATUS_OPTIONS.find((option) => option.value === status.baseStatus)?.label || status.baseStatus}</td>
                    <td className="px-3 py-2 text-gray-600">{status.color || 'Default'}</td>
                    <td className="px-3 py-2 text-gray-600">{status.assetCount}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {status.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(status)} className="text-gray-500 hover:text-primary-600" title="Edit status">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {!status.isActive ? (
                          <button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: status.id, data: { isActive: true } })}
                            className="text-green-600 hover:text-green-700"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = await showConfirm(
                                status.assetCount > 0
                                  ? 'This status is used by assets, so it will be deactivated instead of deleted.'
                                  : 'This status will be deleted.',
                                'Remove asset status?'
                              )
                              if (confirmed) deleteMutation.mutate(status.id)
                            }}
                            className="text-gray-500 hover:text-red-600"
                            title="Remove status"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border border-gray-200 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Asset Issue Notifications</h3>
            <p className="text-xs text-gray-500">Choose who receives an in-app notification when a new equipment issue is created.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={currentNotificationSetting.notifyAdmins}
              onChange={(event) => updateNotificationField({ notifyAdmins: event.target.checked })}
            />
            Notify all admins
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={currentNotificationSetting.notifyStaff}
              onChange={(event) => updateNotificationField({ notifyStaff: event.target.checked })}
            />
            Notify all staff
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Additional specific users</label>
            <select
              multiple
              value={currentNotificationSetting.recipientUserIds}
              onChange={(event) => updateNotificationField({
                recipientUserIds: Array.from(event.target.selectedOptions).map((option) => option.value),
              })}
              className="h-32 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              {users.filter((user) => user.isActive !== false).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-medium text-gray-900">{editingStatus ? 'Edit Asset Status' : 'Add Asset Status'}</h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., Awaiting Parts"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Base Status *</label>
                <select
                  value={form.baseStatus}
                  onChange={(event) => setForm({ ...form, baseStatus: event.target.value as BaseAssetStatus })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {BASE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                <select
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={closeModal} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
