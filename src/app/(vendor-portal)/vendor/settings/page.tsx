'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Mail,
  Smartphone,
  Check,
  Loader2,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VendorNotificationPreference {
  id: string
  emailEnabled: boolean
  smsEnabled: boolean
  smsPhoneNumber: string | null
  taskAssigned: boolean
  taskDueReminder: boolean
  milestoneUpdate: boolean
  contractChange: boolean
  paymentReceived: boolean
  purchaseOrderReceived: boolean
  documentShared: boolean
}

async function fetchPreferences() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('vendor-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-portal/notification-preferences', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch preferences')
  return response.json()
}

async function updatePreferences(data: Partial<VendorNotificationPreference>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('vendor-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-portal/notification-preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update preferences')
  return response.json()
}

export default function VendorSettingsPage() {
  const queryClient = useQueryClient()
  const [smsPhoneNumber, setSmsPhoneNumber] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-notification-preferences'],
    queryFn: fetchPreferences
  })

  const preferences: VendorNotificationPreference | null = data?.preferences
  const vendorPhone: string | null = data?.vendorPhone

  useEffect(() => {
    if (preferences?.smsPhoneNumber) {
      setSmsPhoneNumber(preferences.smsPhoneNumber)
    } else if (vendorPhone) {
      setSmsPhoneNumber(vendorPhone)
    }
  }, [preferences, vendorPhone])

  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      toast.success('Preferences updated!')
      queryClient.invalidateQueries({ queryKey: ['vendor-notification-preferences'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const notificationTypes = [
    { key: 'taskAssigned', label: 'Task Assignments', description: 'When a new task is assigned to you' },
    { key: 'taskDueReminder', label: 'Task Due Reminders', description: 'Reminders for upcoming task deadlines' },
    { key: 'milestoneUpdate', label: 'Milestone Updates', description: 'Updates on project milestones' },
    { key: 'contractChange', label: 'Contract Changes', description: 'When your contract is created or updated' },
    { key: 'paymentReceived', label: 'Payment Notifications', description: 'When payments are recorded' },
    { key: 'purchaseOrderReceived', label: 'Purchase Orders', description: 'When you receive new purchase orders' },
    { key: 'documentShared', label: 'Document Sharing', description: 'When documents are shared with you' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">Manage your notification preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        {/* Channel Toggles */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Notification Channels</h2>

          <div className="space-y-4">
            {/* Email Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.emailEnabled ?? true}
                  onChange={(e) => updateMutation.mutate({ emailEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* SMS Toggle */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.smsEnabled ?? false}
                    onChange={(e) => updateMutation.mutate({ smsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {preferences?.smsEnabled && (
                <div className="ml-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMS Phone Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={smsPhoneNumber}
                      onChange={(e) => setSmsPhoneNumber(e.target.value)}
                      placeholder="e.g., 08012345678 or +2348012345678"
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => updateMutation.mutate({ smsPhoneNumber })}
                      disabled={updateMutation.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Nigerian numbers: 08012345678 or +2348012345678
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Notification Types</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Choose which notifications you want to receive. These apply to both email and SMS when enabled.
          </p>

          <div className="space-y-3">
            {notificationTypes.map(({ key, label, description }) => (
              <label key={key} className="flex items-start p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={preferences ? (preferences as unknown as Record<string, boolean>)[key] ?? true : true}
                    onChange={(e) => updateMutation.mutate({ [key]: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Indicator */}
        {updateMutation.isSuccess && (
          <div className="px-6 pb-6">
            <div className="flex items-center text-green-600 text-sm">
              <Check className="h-4 w-4 mr-2" />
              Changes saved automatically
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
