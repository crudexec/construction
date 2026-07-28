'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Gauge, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface MeterReading {
  id: string
  readingType: 'HOURS' | 'MILES'
  value: number
  recordedAt: string
  notes: string | null
  recordedBy: { id: string; firstName: string; lastName: string }
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchReadings(assetId: string): Promise<MeterReading[]> {
  const response = await fetch(`/api/assets/${assetId}/meter-readings`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch meter readings')
  return response.json()
}

export function AssetMeterReadingsTab({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    readingType: 'HOURS' as 'HOURS' | 'MILES',
    value: '',
    recordedAt: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ['asset-meter-readings', assetId],
    queryFn: () => fetchReadings(assetId)
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await fetch(`/api/assets/${assetId}/meter-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          readingType: data.readingType,
          value: parseFloat(data.value),
          recordedAt: data.recordedAt,
          notes: data.notes || undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to log reading')
      return result
    },
    onSuccess: (result) => {
      if (result.warning) {
        toast(result.warning, { icon: '⚠️', duration: 6000 })
      } else {
        toast.success('Meter reading logged')
      }
      queryClient.invalidateQueries({ queryKey: ['asset-meter-readings', assetId] })
      setShowForm(false)
      setForm({ readingType: 'HOURS', value: '', recordedAt: new Date().toISOString().split('T')[0], notes: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.value) {
      toast.error('Value is required')
      return
    }
    createMutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Meter Reads</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Log Reading
        </button>
      </div>

      {readings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Gauge className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>No meter readings logged yet</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase">
              <th className="py-2">Type</th>
              <th className="py-2">Value</th>
              <th className="py-2">Date</th>
              <th className="py-2">Recorded By</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => (
              <tr key={reading.id} className="border-b border-gray-100">
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                    {reading.readingType === 'HOURS' ? 'Hours' : 'Miles'}
                  </span>
                </td>
                <td className="py-2 font-medium text-gray-900">{reading.value.toLocaleString()}</td>
                <td className="py-2 text-gray-500">{new Date(reading.recordedAt).toLocaleDateString()}</td>
                <td className="py-2 text-gray-500">{reading.recordedBy.firstName} {reading.recordedBy.lastName}</td>
                <td className="py-2 text-gray-500">{reading.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Log Meter Reading</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.readingType} onChange={(e) => setForm({ ...form, readingType: e.target.value as 'HOURS' | 'MILES' })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="HOURS">Hours</option>
                  <option value="MILES">Miles</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <input type="number" step="0.1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : 'Log Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
