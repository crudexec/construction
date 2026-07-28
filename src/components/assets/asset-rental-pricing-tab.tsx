'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface RentalRate {
  id: string
  hourlyRate: number | null
  dailyRate: number | null
  monthlyRate: number | null
  notes: string | null
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string }
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchRates(assetId: string): Promise<RentalRate[]> {
  const response = await fetch(`/api/assets/${assetId}/rental-rates`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch rental rates')
  return response.json()
}

export function AssetRentalPricingTab({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState({ hourlyRate: '', dailyRate: '', monthlyRate: '', notes: '' })

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['asset-rental-rates', assetId],
    queryFn: () => fetchRates(assetId)
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await fetch(`/api/assets/${assetId}/rental-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : null,
          monthlyRate: data.monthlyRate ? parseFloat(data.monthlyRate) : null,
          notes: data.notes || undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update rates')
      return result
    },
    onSuccess: () => {
      toast.success('Rental rates updated')
      queryClient.invalidateQueries({ queryKey: ['asset-rental-rates', assetId] })
      setShowForm(false)
      setForm({ hourlyRate: '', dailyRate: '', monthlyRate: '', notes: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.hourlyRate && !form.dailyRate && !form.monthlyRate) {
      toast.error('Enter at least one rate')
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

  const current = rates[0]
  const history = rates.slice(1)

  return (
    <div className="bg-white rounded-lg shadow border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Rental Pricing</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Update Rates
        </button>
      </div>

      {!current ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p>No rental rates set yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Hourly</p>
            <p className="text-xl font-bold text-gray-900">{current.hourlyRate != null ? formatCurrency(current.hourlyRate) : '—'}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Daily</p>
            <p className="text-xl font-bold text-gray-900">{current.dailyRate != null ? formatCurrency(current.dailyRate) : '—'}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Monthly</p>
            <p className="text-xl font-bold text-gray-900">{current.monthlyRate != null ? formatCurrency(current.monthlyRate) : '—'}</p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-primary-600 hover:text-primary-800">
            {showHistory ? 'Hide' : 'Show'} history ({history.length})
          </button>
          {showHistory && (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="py-2">Hourly</th>
                  <th className="py-2">Daily</th>
                  <th className="py-2">Monthly</th>
                  <th className="py-2">Set By</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rate) => (
                  <tr key={rate.id} className="border-b border-gray-100">
                    <td className="py-2">{rate.hourlyRate != null ? formatCurrency(rate.hourlyRate) : '—'}</td>
                    <td className="py-2">{rate.dailyRate != null ? formatCurrency(rate.dailyRate) : '—'}</td>
                    <td className="py-2">{rate.monthlyRate != null ? formatCurrency(rate.monthlyRate) : '—'}</td>
                    <td className="py-2 text-gray-500">{rate.createdBy.firstName} {rate.createdBy.lastName}</td>
                    <td className="py-2 text-gray-500">{new Date(rate.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Update Rental Rates</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-xs text-gray-500">Saving creates a new rate entry — past rates stay visible in history.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                <input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
                <input type="number" step="0.01" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate</label>
                <input type="number" step="0.01" value={form.monthlyRate} onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : 'Save Rates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
