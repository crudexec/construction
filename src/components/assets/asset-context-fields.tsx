'use client'

import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Context = { currentProjectId?: string | null; currentYardId?: string | null; currentLocation?: string | null }
export function locationValue(asset: Context) {
  return asset.currentProjectId ? `project:${asset.currentProjectId}` : asset.currentYardId ? `yard:${asset.currentYardId}` : asset.currentLocation ? 'legacy' : ''
}
export function locationFields(value: string) {
  if (value === 'legacy') return {}
  return { currentProjectId: value.startsWith('project:') ? value.slice(8) : null, currentYardId: value.startsWith('yard:') ? value.slice(5) : null }
}

async function fetchJson(url: string) {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('Options could not be loaded')
  return response.json()
}

export function AssetLocationSelect({ value, onChange, currentLabel }: { value: string; onChange: (value: string) => void; currentLabel?: string | null }) {
  const id = useId()
  const client = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const options = useQuery({
    queryKey: ['asset-location-options'],
    queryFn: async () => {
      const [projects, yards] = await Promise.all([fetchJson('/api/project'), fetchJson('/api/asset-yards')])
      return { projects: (Array.isArray(projects) ? projects : projects.projects || []) as { id: string; title: string }[], yards: yards as { id: string; name: string }[] }
    },
  })
  const add = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/asset-yards', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not add yard')
      return result
    },
    onSuccess: yard => { client.invalidateQueries({ queryKey: ['asset-location-options'] }); onChange(`yard:${yard.id}`); setAdding(false); setName('') },
  })
  const known = options.data?.projects.some(item => value === `project:${item.id}`) || options.data?.yards.some(item => value === `yard:${item.id}`)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">Location (job or yard)</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)} disabled={options.isLoading || options.isError} className="w-full border border-gray-300 rounded-md px-3 py-2">
        <option value="">No location</option>
        {value && !known && <option value={value}>{currentLabel || 'Selected location'}{value === 'legacy' ? ' (legacy text)' : ''}</option>}
        <optgroup label="Jobs">
          {options.data?.projects.map(project => <option key={project.id} value={`project:${project.id}`}>{project.title}</option>)}
        </optgroup>
        <optgroup label="Equipment yards">
          {options.data?.yards.map(yard => <option key={yard.id} value={`yard:${yard.id}`}>{yard.name}</option>)}
        </optgroup>
      </select>
      {value === 'legacy' && <p className="mt-1 text-xs text-gray-500">Existing text is preserved. Choose a job or yard to link this location.</p>}
      {options.isError && <p role="alert" className="text-sm text-red-600">Could not load locations. <button type="button" onClick={() => options.refetch()} className="underline">Retry</button></p>}
      {adding ? <div className="mt-2 space-y-2">
        <input aria-label="New yard name" value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder="Yard name" className="w-full border rounded-md px-3 py-2" />
        {add.error && <p role="alert" className="text-sm text-red-600">{add.error.message}</p>}
        <div className="flex gap-3 text-sm"><button type="button" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()} className="text-primary-600 disabled:opacity-50">Save yard</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></div>
      </div> : <button type="button" onClick={() => setAdding(true)} className="mt-1 text-xs font-medium text-primary-600">+ Add yard</button>}
    </div>
  )
}

export function AssetPersonSelect({ value, onChange, currentLabel }: { value: string; onChange: (value: string) => void; currentLabel?: string | null }) {
  const id = useId()
  const { data: users = [], isLoading, isError, refetch } = useQuery<{ id: string; firstName: string; lastName: string }[]>({ queryKey: ['company-users'], queryFn: () => fetchJson('/api/users') })
  return <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">Assignment (person)</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} disabled={isLoading || isError} className="w-full border border-gray-300 rounded-md px-3 py-2">
      <option value="">Unassigned</option>
      {value && !users.some(user => user.id === value) && <option value={value}>{currentLabel || 'Current assignee'}</option>}
      {users.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
    </select>
    {isError && <p role="alert" className="text-sm text-red-600">Could not load people. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></p>}
  </div>
}
