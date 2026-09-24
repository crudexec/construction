'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AssetProfileFields } from '@/components/assets/asset-profile-fields'
import { AssetFieldLayoutControl, useAssetFieldLayout } from '@/components/assets/asset-field-layout'
import { locationFields } from '@/components/assets/asset-context-fields'
import { emptyAssetProfile, type AssetProfileValues } from '@/lib/assets/field-layout'

export default function NewAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyAssetProfile)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const layout = useAssetFieldLayout()
  const { data: statuses = [] } = useQuery<{ id: string; name: string; baseStatus: AssetProfileValues['status'] }[]>({
    queryKey: ['asset-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/asset-statuses')
      if (!response.ok) throw new Error('Unable to load asset statuses')
      return response.json()
    },
  })
  const createMutation = useMutation({
    mutationFn: async () => {
      const { locationSelection, currentLocation: _legacy, ...data } = formData
      const response = await fetch('/api/assets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          equipmentId: data.equipmentId.trim() || null,
          category: data.category.trim() || null,
          statusDefinitionId: data.statusDefinitionId || null,
          currentAssigneeId: data.currentAssigneeId || null,
          ...locationFields(locationSelection),
          purchaseCost: data.purchaseCost === '' ? null : Number(data.purchaseCost),
          financedAmount: data.financedAmount === '' ? null : Number(data.financedAmount),
          salvageValue: data.salvageValue === '' ? null : Number(data.salvageValue),
          customFieldValues: Object.fromEntries(Object.entries(customValues).filter(([id]) => layout.data?.customFields.some(field => field.id === id && field.isActive))),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create asset')
      return result
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      router.push('/dashboard/assets/' + data.id)
    },
    onError: (error: Error) => setError(error.message),
  })

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assets" className="text-gray-600 hover:text-gray-900" aria-label="Back to Assets"><ArrowLeft className="h-6 w-6" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">Add New Asset</h1><p className="text-gray-600">Create a new equipment, vehicle, or tool profile</p></div>
      </div>
      <AssetFieldLayoutControl />
    </div>
    {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}
    {layout.isPending && <p role="status">Loading field layout…</p>}
    {layout.isError && <p role="alert" className="text-red-700">Unable to load company field layout. <button type="button" onClick={() => layout.refetch()} className="underline">Retry layout</button></p>}
    <form onSubmit={event => {
      event.preventDefault()
      setError(null)
      if (!formData.name.trim()) { setError('Asset name is required'); return }
      if (layout.data && !layout.isError) createMutation.mutate()
    }} className="space-y-6">
      {layout.data && <section className="bg-white rounded-lg shadow border p-6" aria-label="Asset information">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Asset Information</h3>
        <AssetProfileFields creating values={formData} onChange={patch => setFormData(prev => ({ ...prev, ...patch }))} customValues={customValues} onCustomChange={(id, value) => setCustomValues(prev => ({ ...prev, [id]: value }))} layout={layout.data} statuses={statuses} />
      </section>}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Link href="/dashboard/assets" className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</Link>
        <button type="submit" disabled={createMutation.isPending || !layout.data || layout.isError} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{createMutation.isPending ? 'Creating...' : 'Create Asset'}</button>
      </div>
    </form>
  </div>
}
