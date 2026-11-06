'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { ErrorMessage } from '@/components/feedback/shared'
import { assetButton, assetControl, assetPrimary } from './asset-request-dialog'

interface NotificationSettings {
  id: string
  notifyAdmins: boolean
  notifyStaff: boolean
  recipientUserIds: string[]
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch('/api/asset-issue-notification-settings', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch notification settings')
  return response.json()
}

async function fetchUsers(): Promise<UserOption[]> {
  const response = await fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

export function AssetIssueDialog({ assetId, assetName, close, created }: { assetId: string; assetName?: string; close: () => void; created?: () => void }) {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close(); opener.current?.focus() }
  }, [])
  const [form, setForm] = useState({
    title: '', description: '', status: 'OPEN', urgency: 'MEDIUM', meterReadingType: 'HOURS', meterReadingValue: ''
  })

  const { data: notificationSettings, error: notificationError, refetch: refetchNotifications } = useQuery({
    queryKey: ['asset-issue-notification-settings', user?.companyId],
    queryFn: fetchNotificationSettings,
    enabled: user?.role === 'ADMIN'
  })

  const { data: users = [], error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['company-users', user?.companyId],
    queryFn: fetchUsers,
    enabled: user?.role === 'ADMIN'
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await fetch(`/api/assets/${assetId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description || undefined,
          status: data.status,
          urgency: data.urgency,
          meterReadingType: data.meterReadingType,
          meterReadingValue: data.meterReadingValue
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create issue')
      return result
    },
    onSuccess: () => {
      toast.success('Issue logged')
      queryClient.invalidateQueries({ queryKey: ['asset-issues', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset-meter-readings', assetId] })
      queryClient.invalidateQueries({ queryKey: ['all-asset-issues'] })
      close(); created?.()

    },
    onError: (error: Error) => toast.error(error.message)
  })

  const updateNotificationMutation = useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) => {
      const response = await fetch('/api/asset-issue-notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          notifyAdmins: notificationSettings?.notifyAdmins ?? true,
          notifyStaff: notificationSettings?.notifyStaff ?? false,
          recipientUserIds: notificationSettings?.recipientUserIds ?? [],
          ...patch
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update notification settings')
      return result
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['asset-issue-notification-settings', user?.companyId] }).then(() => toast.success('Notification routing updated'))
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (!form.meterReadingType || !form.meterReadingValue) {
      toast.error('Meter type and reading are required when logging an issue')
      return
    }
    if (!createMutation.isPending) createMutation.mutate(form)
  }

  const toggleRecipient = (userId: string) => {
    const currentIds = notificationSettings?.recipientUserIds ?? []
    updateNotificationMutation.mutate({
      recipientUserIds: currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId]
    })
  }

  return <dialog ref={dialog} aria-labelledby="asset-issue-title" onCancel={event => { event.preventDefault(); if (!createMutation.isPending) close() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-0 text-gray-900 backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div className="min-w-0"><h2 id="asset-issue-title" className="text-sm font-semibold">Log an Issue</h2>{assetName && <p className="mt-1 break-words text-xs text-gray-600">{assetName}</p>}</div>
      <button type="button" aria-label="Close issue form" onClick={close} disabled={createMutation.isPending} className={`${assetButton} shrink-0 border-0 px-2`}><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
              <fieldset disabled={createMutation.isPending} className="space-y-4">
              <div>
                <label htmlFor="issue-title" className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input id="issue-title" autoFocus type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${assetControl} w-full`} placeholder="e.g., Hydraulic leak on left arm" />
              </div>
              <div>
                <label htmlFor="issue-description" className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea id="issue-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${assetControl} w-full`} />
              </div>
              <div>
                <label htmlFor="issue-urgency" className="block text-xs font-medium text-gray-700 mb-1">Urgency</label>
                <select id="issue-urgency" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className={`${assetControl} w-full`}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label htmlFor="issue-status" className="block text-xs font-medium text-gray-700 mb-1">Initial Issue Status</label>
                <select id="issue-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${assetControl} w-full`}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-700 mb-1">Meter reading at issue report *</p>
                <p className="text-xs text-gray-500 mb-2">Every issue captures the asset's current hours or miles and stores it as a dated meter history entry.</p>
                <div className="grid grid-cols-2 gap-3">
                  <select required aria-label="Issue meter type" value={form.meterReadingType} onChange={(e) => setForm({ ...form, meterReadingType: e.target.value })} className={`${assetControl} w-full min-w-0`}>
                    <option value="HOURS">Hours</option>
                    <option value="MILES">Miles</option>
                  </select>
                  <input
                    aria-label="Issue meter reading"
                    min="0" type="number"
                    step="0.1"
                    required
                    value={form.meterReadingValue}
                    onChange={(e) => setForm({ ...form, meterReadingValue: e.target.value })}
                    className={`${assetControl} w-full min-w-0`}
                    placeholder={form.meterReadingType === 'MILES' ? 'Odometer miles' : 'Hour meter'}
                  />
                </div>
              </div>
              {user?.role === 'ADMIN' && <fieldset disabled={!notificationSettings || updateNotificationMutation.isPending} className="border-t pt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">Notification Routing</p>
                  <p className="text-xs text-gray-500">New issue alerts follow these company-level recipients.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={notificationSettings?.notifyAdmins ?? true}
                    onChange={(e) => updateNotificationMutation.mutate({ notifyAdmins: e.target.checked })}
                    disabled={updateNotificationMutation.isPending}
                  />
                  Notify admins
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={notificationSettings?.notifyStaff ?? false}
                    onChange={(e) => updateNotificationMutation.mutate({ notifyStaff: e.target.checked })}
                    disabled={updateNotificationMutation.isPending}
                  />
                  Notify staff
                </label>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Specific users</p>
                  <div className="max-h-24 overflow-y-auto rounded-md border border-gray-200 p-2 space-y-1">
                    {users.length === 0 ? (
                      <p className="text-xs text-gray-400">No users available</p>
                    ) : users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={(notificationSettings?.recipientUserIds ?? []).includes(user.id)}
                          onChange={() => toggleRecipient(user.id)}
                          disabled={updateNotificationMutation.isPending}
                        />
                        <span>{user.firstName} {user.lastName} <span className="text-gray-400">({user.email})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>}
              {user?.role === 'ADMIN' && <ErrorMessage error={notificationError || usersError} retry={() => { void refetchNotifications(); void refetchUsers() }} />}
              </fieldset>
              <ErrorMessage error={createMutation.error} />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={close} disabled={createMutation.isPending} className={assetButton}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateNotificationMutation.isPending || !form.title.trim()} className={assetPrimary}>
                  {createMutation.isPending ? 'Logging...' : 'Log Issue'}
                </button>
              </div>
            </form>
  </dialog>
}
