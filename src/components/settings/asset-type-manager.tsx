'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useAssetTypes } from '@/components/assets/asset-type-select'
import { api, button, control, ErrorMessage, primary } from '@/components/feedback/shared'

export function AssetTypeManager() {
  const query = useAssetTypes(), client = useQueryClient(), admin = useAuthStore(state => state.user?.role === 'ADMIN')
  const [editing, setEditing] = useState<string | null>(null), [name, setName] = useState('')
  const save = useMutation({ mutationFn: ({ key, ...body }: { key?: string; name?: string; isActive?: boolean }) => api(key ? `/api/asset-types/${encodeURIComponent(key)}` : '/api/asset-types', body, key ? 'PATCH' : 'POST'), onSuccess: async () => { setEditing(null); setName(''); await client.invalidateQueries({ queryKey: ['asset-types'] }); await client.invalidateQueries({ queryKey: ['assets'] }) } })
  const edit = (key: string, value: string) => { setEditing(key); setName(value); save.reset() }
  const form = <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (name.trim() && !save.isPending) save.mutate({ ...(editing !== 'new' ? { key: editing! } : {}), name: name.trim() }) }}>
    <div className="min-w-0 flex-1"><label htmlFor="asset-type-name" className="mb-1 block text-sm font-medium">Type name</label><input autoFocus id="asset-type-name" className={control} maxLength={80} required value={name} disabled={save.isPending} onChange={event => setName(event.target.value)} /></div>
    <button className={primary} disabled={save.isPending || !name.trim()}>{save.isPending ? 'Saving…' : 'Save type'}</button><button type="button" className={button} disabled={save.isPending} onClick={() => { setEditing(null); save.reset() }}>Cancel</button>
  </form>
  return <section className="space-y-5" aria-labelledby="asset-types-heading">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="asset-types-heading" className="text-lg font-semibold text-gray-900">Asset types</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Add and rename types for your company. Archive unused types without changing existing assets.</p></div>{admin && <button className={button} disabled={save.isPending} onClick={() => edit('new', '')}><Plus className="h-4 w-4" />Add type</button>}</div>
    <ErrorMessage error={query.error} retry={() => { void query.refetch() }} /><ErrorMessage error={save.error} />
    {query.isPending && <p role="status" className="py-6 text-sm text-gray-600">Loading asset types…</p>}
    {editing === 'new' && form}
    <ul className="divide-y divide-gray-200">{query.data?.map(type => <li key={type.key} className="py-4">
      {editing === type.key ? form : <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium text-gray-900">{type.name}{!type.isActive && <span className="ml-2 text-xs font-normal text-gray-500">Archived</span>}</p><p className="mt-1 text-xs text-gray-600">{type.assetCount || 0} {type.assetCount === 1 ? 'asset' : 'assets'}</p></div>{admin && <div className="flex gap-2"><button aria-label={`Rename ${type.name}`} className={button} disabled={save.isPending} onClick={() => edit(type.key, type.name)}><Pencil className="h-4 w-4" />Rename</button><button className={button} disabled={save.isPending || editing !== null} onClick={() => { save.reset(); save.mutate({ key: type.key, isActive: !type.isActive }) }}>{type.isActive ? 'Archive' : 'Restore'}</button></div>}</div>}
    </li>)}</ul>
    {!admin && <p className="text-sm text-gray-600">Company administrators can manage these types.</p>}
  </section>
}
