'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  Server,
  Key,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  TestTube,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

type EmailProvider = 'NONE' | 'SENDGRID' | 'AWS_SES' | 'SMTP' | 'RESEND'

interface EmailConfig {
  id: string
  provider: EmailProvider
  fromEmail: string | null
  fromName: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpSecure: boolean
  isActive: boolean
  lastTestedAt: string | null
  testError: string | null
}

export function EmailConfigForm() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [showTestEmail, setShowTestEmail] = useState(false)

  const [form, setForm] = useState({
    provider: 'NONE' as EmailProvider,
    apiKey: '',
    fromEmail: '',
    fromName: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    isActive: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/company/email-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch config')
      return response.json()
    }
  })

  const config: EmailConfig | null = data?.config

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider,
        apiKey: '', // Don't populate for security
        fromEmail: config.fromEmail || '',
        fromName: config.fromName || '',
        smtpHost: config.smtpHost || '',
        smtpPort: config.smtpPort?.toString() || '',
        smtpUser: config.smtpUser || '',
        smtpPassword: '', // Don't populate for security
        smtpSecure: config.smtpSecure,
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

      const response = await fetch('/api/company/email-config', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: form.provider,
          ...(form.apiKey && { apiKey: form.apiKey }),
          fromEmail: form.fromEmail || null,
          fromName: form.fromName || null,
          smtpHost: form.smtpHost || null,
          smtpPort: form.smtpPort ? parseInt(form.smtpPort) : null,
          smtpUser: form.smtpUser || null,
          ...(form.smtpPassword && { smtpPassword: form.smtpPassword }),
          smtpSecure: form.smtpSecure,
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
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
      toast.success('Email configuration saved')
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

      const response = await fetch('/api/company/email-config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sendTestEmail: showTestEmail && testEmailAddress,
          testEmailAddress: testEmailAddress || undefined,
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Test failed')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })

      if (data.connectionTest?.success) {
        if (data.sendTest?.success) {
          toast.success('Connection test passed and test email sent!')
        } else if (data.sendTest) {
          toast.error(`Connection OK but email failed: ${data.sendTest.error}`)
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
    { value: 'SENDGRID', label: 'SendGrid' },
    { value: 'RESEND', label: 'Resend' },
    { value: 'AWS_SES', label: 'AWS SES' },
    { value: 'SMTP', label: 'SMTP Server' },
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
            <div>
              <p className="font-medium">
                {config.isActive && config.provider !== 'NONE'
                  ? config.testError
                    ? 'Email configured but has errors'
                    : 'Email is configured and active'
                  : 'Email notifications are disabled'}
              </p>
              {config.provider !== 'NONE' && (
                <p className="text-sm text-gray-600">
                  Provider: {config.provider} • From: {config.fromEmail}
                  {config.lastTestedAt && (
                    <> • Last tested: {format(new Date(config.lastTestedAt), 'MMM d, yyyy h:mm a')}</>
                  )}
                </p>
              )}
              {config.testError && (
                <p className="text-sm text-red-600 mt-1">Error: {config.testError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold">Email Configuration</h2>
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
              Email Provider
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as EmailProvider })}
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
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={form.fromName}
                    onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                    placeholder="BuildFlo"
                  />
                </div>
              </div>

              {/* API Key for SendGrid, Resend, AWS SES */}
              {['SENDGRID', 'RESEND', 'AWS_SES'].includes(form.provider) && (
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
                    placeholder={data?.hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                  />
                  {form.provider === 'AWS_SES' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Format: accessKeyId:secretAccessKey:region (e.g., AKIAXXXXXXX:secret123:us-east-1)
                    </p>
                  )}
                </div>
              )}

              {/* SMTP Fields */}
              {form.provider === 'SMTP' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Server className="h-4 w-4 inline-block mr-1" />
                        SMTP Host <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.smtpHost}
                        onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Port <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.smtpPort}
                        onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        value={form.smtpUser}
                        onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SMTP Password
                      </label>
                      <input
                        type="password"
                        value={form.smtpPassword}
                        onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder={data?.hasSmtpPassword ? '••••••••' : 'password'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={form.smtpSecure}
                      onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })}
                      disabled={!isEditing}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <label htmlFor="smtpSecure" className="text-sm text-gray-700">
                      Use TLS/SSL (recommended)
                    </label>
                  </div>
                </>
              )}

              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 h-5 w-5"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Enable email notifications
                </label>
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
                      fromEmail: config.fromEmail || '',
                      fromName: config.fromName || '',
                      smtpHost: config.smtpHost || '',
                      smtpPort: config.smtpPort?.toString() || '',
                      smtpUser: config.smtpUser || '',
                      smtpPassword: '',
                      smtpSecure: config.smtpSecure,
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
                  id="sendTestEmail"
                  checked={showTestEmail}
                  onChange={(e) => setShowTestEmail(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="sendTestEmail" className="text-sm text-gray-700">
                  Send a test email
                </label>
              </div>

              {showTestEmail && (
                <div className="mb-4">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter email address for test"
                  />
                </div>
              )}

              <button
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || (showTestEmail && !testEmailAddress)}
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
