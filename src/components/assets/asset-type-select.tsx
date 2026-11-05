'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/components/feedback/shared'
import { assetTypeLabel, defaultAssetTypes, type AssetTypeOption } from '@/lib/assets/type-options'
export function useAssetTypes() {
  const userId = useAuthStore(state => state.user?.id)
  return useQuery({ queryKey: ['asset-types', userId], queryFn: () => api<AssetTypeOption[]>('/api/asset-types'), enabled: !!userId, retry: false })
}
export function AssetTypeSelect({ id, value, onChange, creating = false }: { id: string; value: string; onChange: (value: string) => void; creating?: boolean }) {
  const query = useAssetTypes(), types = query.data || defaultAssetTypes
  const options = types.filter(type => type.isActive || (!creating && type.key === value))
  useEffect(() => {
    if (creating && query.data && !query.data.some(type => type.isActive && type.key === value)) onChange(query.data.find(type => type.isActive)?.key || '')
  }, [creating, query.data, value, onChange])
  return <>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} required disabled={query.isPending || query.isError} className="w-full rounded-md border border-gray-300 px-3 py-2">
      <option value="" disabled>Choose a type</option>
      {!creating && value && !options.some(type => type.key === value) && <option value={value}>{assetTypeLabel(value)} (current)</option>}
      {options.map(type => <option key={type.key} value={type.key}>{type.name}{!type.isActive ? ' (archived)' : ''}</option>)}
    </select>
    {query.isError && <p role="alert" className="mt-1 text-sm text-red-700">Could not load asset types. <button type="button" onClick={() => query.refetch()} className="min-h-11 underline">Retry</button></p>}
    {!query.isPending && !options.length && <p className="mt-1 text-sm text-gray-600">An administrator can add or restore types in Settings → Assets → Types.</p>}
  </>
}
