'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Wrench, CheckCircle, Clock, Plus, X } from 'lucide-react'

interface SharedAssetData {
  asset: {
    id: string
    name: string
    make: string | null
    model: string | null
    year: number | null
    serialNumber: string | null
    status: string
  }
  company: { name: string; logo: string | null } | null
  issues: {
    id: string
    title: string
    description: string | null
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    reporterName: string | null
    createdAt: string
    resolvedAt: string | null
    meterReading: { readingType: 'HOURS' | 'MILES'; value: number; recordedAt: string } | null
    reportedBy: { firstName: string; lastName: string } | null
  }[]
}

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700'
}

const STATUS_ICONS: Record<string, ReactElement> = {
  OPEN: <AlertCircle className="h-4 w-4 text-red-500" />,
  IN_PROGRESS: <Wrench className="h-4 w-4 text-orange-500" />,
  RESOLVED: <CheckCircle className="h-4 w-4 text-green-500" />,
  CLOSED: <CheckCircle className="h-4 w-4 text-gray-400" />
}

export default function SharedAssetIssueLogPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<SharedAssetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    reporterName: '',
    urgency: 'MEDIUM',
    meterReadingType: 'HOURS' as 'HOURS' | 'MILES',
    meterReadingValue: ''
  })

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/shared/asset/${token}`)
      if (!response.ok) throw new Error('Asset not found or sharing disabled')
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/shared/asset/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to submit issue')
      }
      setForm({ title: '', description: '', reporterName: '', urgency: 'MEDIUM', meterReadingType: 'HOURS', meterReadingValue: '' })
      setShowForm(false)
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit issue')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700">{error || 'Asset not found'}</p>
        </div>
      </div>
    )
  }

  const { asset, company, issues } = data
  const subtitle = [asset.make, asset.model, asset.year].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {company?.name && <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{company.name}</p>}
          <h1 className="text-xl font-bold text-gray-900">{asset.name}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {asset.serialNumber && <p className="text-xs text-gray-400 mt-1">S/N: {asset.serialNumber}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700 flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Report an Issue
        </button>

        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Issue Log</h2>
          {issues.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              No issues reported for this equipment
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div key={issue.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {STATUS_ICONS[issue.status]}
                      <div>
                        <p className="font-medium text-gray-900">{issue.title}</p>
                        {issue.description && <p className="text-sm text-gray-600 mt-0.5">{issue.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {issue.reportedBy ? `${issue.reportedBy.firstName} ${issue.reportedBy.lastName}` : issue.reporterName || 'Unknown'}
                          {' · '}
                          {new Date(issue.createdAt).toLocaleDateString()}
                          {issue.meterReading && (
                            <>
                              {' · '}
                              {issue.meterReading.value.toLocaleString()} {issue.meterReading.readingType.toLowerCase()}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${URGENCY_COLORS[issue.urgency]}`}>
                      {issue.urgency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Report an Issue</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={form.reporterName}
                  onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Hydraulic leak on left arm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  value={form.urgency}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Meter Reading *</p>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.meterReadingType}
                    onChange={(e) => setForm({ ...form, meterReadingType: e.target.value as 'HOURS' | 'MILES' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="HOURS">Hours</option>
                    <option value="MILES">Miles</option>
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={form.meterReadingValue}
                    onChange={(e) => setForm({ ...form, meterReadingValue: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={form.meterReadingType === 'MILES' ? 'Odometer miles' : 'Hour meter'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center pt-6">
        <Clock className="h-3 w-3 text-gray-300 mr-1" />
        <p className="text-xs text-gray-300">Powered by {company?.name || 'the maintenance team'}</p>
      </div>
    </div>
  )
}
