'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  Key,
  User,
  Hash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  TestTube,
  Loader2,
  Wallet
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

type SMSProvider = 'NONE' | 'AFRICAS_TALKING'

interface SMSConfig {
  id: string
  provider: SMSProvider
  username: string | null
  shortCode: string | null
  isActive: boolean
  lastTestedAt: string | null
  testError: string | null
}

interface SMSBalance {
  balance: number
  currency: string
}

export function SMSConfigForm() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [showTestSMS, setShowTestSMS] = useState(false)
  const [balance, setBalance] = useState<SMSBalance | null>(null)

  const [form, setForm] = useState({
    provider: 'NONE' as SMSProvider,
    apiKey: '',
    username: '',
    shortCode: '',
    isActive: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['sms-config'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/company/sms-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch config')
      return response.json()
    }
  })

  const config: SMSConfig | null = data?.config

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider,
        apiKey: '', // Don't populate for security
        username: config.username || '',
        shortCode: config.shortCode || '',
        isActive: config.isActive,
      })
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/company/sms-config', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: form.provider,
          ...(form.apiKey && { apiKey: form.apiKey }),
          username: form.username || null,
          shortCode: form.shortCode || null,
          isActive: form.isActive,
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to save config')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] })
      toast.success('SMS configuration saved')
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/company/sms-config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sendTestSMS: showTestSMS && testPhoneNumber,
          testPhoneNumber: testPhoneNumber || undefined,
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Test failed')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] })

      // Update balance if available
      if (data.balance) {
        setBalance(data.balance)
      }

      if (data.connectionTest?.success) {
        if (data.sendTest?.success) {
          toast.success('Connection test passed and test SMS sent!')
        } else if (data.sendTest) {
          toast.error(`Connection OK but SMS failed: ${data.sendTest.error}`)
        } else {
          toast.success('Connection test passed!')
        }
      } else {
        toast.error(data.connectionTest?.error || 'Connection test failed')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const providers = [
    { value: 'NONE', label: 'None (Disabled)' },
    { value: 'AFRICAS_TALKING', label: "Africa's Talking" },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {config && (
        <div className={`p-4 rounded-lg border ${
          config.isActive && config.provider !== 'NONE'
            ? config.testError
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {config.isActive && config.provider !== 'NONE' ? (
              config.testError ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {config.isActive && config.provider !== 'NONE'
                  ? config.testError
                    ? 'SMS configured but has errors'
                    : 'SMS is configured and active'
                  : 'SMS notifications are disabled'}
              </p>
              {config.provider !== 'NONE' && (
                <p className="text-sm text-gray-600">
                  Provider: Africa&apos;s Talking • Username: {config.username}
                  {config.shortCode && <> • Sender ID: {config.shortCode}</>}
                  {config.lastTestedAt && (
                    <> • Last tested: {format(new Date(config.lastTestedAt), 'MMM d, yyyy h:mm a')}</>
                  )}
                </p>
              )}
              {config.testError && (
                <p className="text-sm text-red-600 mt-1">Error: {config.testError}</p>
              )}
            </div>
            {balance && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {balance.currency} {balance.balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold">SMS Configuration</h2>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
            >
              Edit Configuration
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMS Provider
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as SMSProvider })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            >
              {providers.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {form.provider !== 'NONE' && (
            <>
              {/* Africa's Talking Fields */}
              {form.provider === 'AFRICAS_TALKING' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="h-4 w-4 inline-block mr-1" />
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="Your AT username (or 'sandbox' for testing)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use &apos;sandbox&apos; for testing, your actual username for production
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Hash className="h-4 w-4 inline-block mr-1" />
                        Sender ID / Short Code
                      </label>
                      <input
                        type="text"
                        value={form.shortCode}
                        onChange={(e) => setForm({ ...form, shortCode: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="e.g., BuildFlo (optional)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Custom sender ID shown to recipients (requires approval from AT)
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Key className="h-4 w-4 inline-block mr-1" />
                      API Key {!data?.hasApiKey && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                      placeholder={data?.hasApiKey ? '••••••••••••••••' : 'Enter your API key from AT dashboard'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from{' '}
                      <a
                        href="https://account.africastalking.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Africa&apos;s Talking Dashboard
                      </a>
                    </p>
                  </div>
                </>
              )}

              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="smsIsActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 h-5 w-5"
                />
                <label htmlFor="smsIsActive" className="text-sm font-medium text-gray-700">
                  Enable SMS notifications
                </label>
              </div>

              {/* Pricing Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>SMS Pricing:</strong> Africa&apos;s Talking charges per SMS segment (160 characters).
                  Typical costs: Nigeria ~NGN 4.00/SMS, Kenya ~KES 0.80/SMS.
                  <a
                    href="https://africastalking.com/sms#pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    View full pricing
                  </a>
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          {isEditing ? (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setIsEditing(false)
                  if (config) {
                    setForm({
                      provider: config.provider,
                      apiKey: '',
                      username: config.username || '',
                      shortCode: config.shortCode || '',
                      isActive: config.isActive,
                    })
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          ) : config?.provider !== 'NONE' && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Test Configuration</h3>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="sendTestSMS"
                  checked={showTestSMS}
                  onChange={(e) => setShowTestSMS(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="sendTestSMS" className="text-sm text-gray-700">
                  Send a test SMS
                </label>
              </div>

              {showTestSMS && (
                <div className="mb-4">
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter phone number (e.g., 08012345678 or +2348012345678)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nigerian numbers can be entered as 08012345678 or +2348012345678
                  </p>
                </div>
              )}

              <button
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || (showTestSMS && !testPhoneNumber)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                {testMutation.isPending ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
