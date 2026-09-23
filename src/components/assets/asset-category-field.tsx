'use client'

import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'

export async function fetchAssetCategories(type?: string): Promise<string[]> {
  const params = new URLSearchParams()
  if (type && type !== 'all') params.set('type', type)
  const response = await fetch(`/api/asset-categories?${params}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Could not load asset categories')
  return response.json()
}

export function AssetCategoryField({ type, value, onChange }: { type: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  const { data: categories = [], isError } = useQuery({
    queryKey: ['asset-categories', type],
    queryFn: () => fetchAssetCategories(type),
  })
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">Category</label>
      <input
        id={id}
        list={`${id}-options`}
        value={value}
        onChange={event => onChange(event.target.value)}
        maxLength={100}
        placeholder="e.g., Excavator"
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
      <datalist id={`${id}-options`}>
        {categories.map(category => <option key={category} value={category} />)}
      </datalist>
      <p className="mt-1 text-xs text-gray-500">{isError ? 'Suggestions could not be loaded. You can still enter a category.' : 'Choose an existing category for this type, or enter a new one.'}</p>
    </div>
  )
}
