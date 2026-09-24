'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { defaultAssetFieldOrder, STANDARD_ASSET_FIELDS, type AssetFieldLayout, type StandardAssetField } from '@/lib/assets/field-layout'

export function useAssetFieldLayout() {
  const companyId = useAuthStore(state => state.user?.companyId)
  return useQuery<AssetFieldLayout>({
    queryKey: ['asset-field-layout', companyId],
    queryFn: async () => {
      const response = await fetch('/api/asset-field-layout', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load company field layout')
      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function AssetFieldLayoutControl() {
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN')
  const query = useAssetFieldLayout()
  const [editing, setEditing] = useState(false)
  if (!isAdmin) return null
  return <>
    <button type="button" disabled={!query.data || query.isError} onClick={() => setEditing(true)} className="text-sm font-medium text-primary-600 hover:text-primary-800 disabled:opacity-50">Arrange fields</button>
    {editing && query.data && <LayoutEditor initial={query.data} onClose={() => setEditing(false)} reload={async () => {
      const result = await query.refetch()
      if (result.error || !result.data) throw new Error('Unable to reload layout')
      return result.data
    }} />}
  </>
}

function LayoutEditor({ initial, onClose, reload }: { initial: AssetFieldLayout; onClose: () => void; reload: () => Promise<AssetFieldLayout> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const client = useQueryClient()
  const [base, setBase] = useState(initial)
  const [order, setOrder] = useState(initial.order)
  const [reset, setReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])

  function move(index: number, offset: number) {
    const next = [...order]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    setOrder(next)
    setReset(false)
    setAnnouncement(`Field moved to position ${index + offset + 1} of ${order.length}`)
  }
  async function save() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/asset-field-layout', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, version: base.version, ...(reset ? { reset: true } : {}) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save layout')
      await client.invalidateQueries({ queryKey: ['asset-field-layout'] })
      onClose()
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save layout') }
    finally { setBusy(false) }
  }
  async function reloadDraft() {
    setBusy(true)
    try {
      const latest = await reload()
      setBase(latest); setOrder(latest.order); setReset(false); setError('')
      setAnnouncement('Latest saved layout loaded. Unsaved moves discarded.')
    } catch { setError('Unable to reload layout. Please try again.') }
    finally { setBusy(false) }
  }

  return <dialog ref={dialog} aria-labelledby="asset-layout-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className="w-[min(95vw,600px)] max-h-[90vh] rounded-lg shadow-xl p-0 backdrop:bg-black/50">
    <div className="p-5 border-b flex justify-between gap-3">
      <div><h3 id="asset-layout-title" className="text-lg font-semibold">Arrange asset fields</h3>
        <p className="text-sm text-gray-600 mt-1">Company-wide order for create/edit forms and overview. Changes apply after saving. The Purchase tab uses the same order for its fields.</p></div>
      <button type="button" aria-label="Close field layout" onClick={onClose} disabled={busy} className="self-start p-1"><X className="h-5 w-5" /></button>
    </div>
    <div className="px-5 py-3">
      <p className="text-xs text-gray-500 mb-3">Mix standard and custom fields. New fields are appended automatically. Overview skips empty fields. Inactive custom fields stay read-only on existing records.</p>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <div role="alert" className="text-sm text-red-700 bg-red-50 p-3 mb-3">{error} <button type="button" disabled={busy} onClick={reloadDraft} className="underline">Reload layout</button></div>}
      <ol aria-label="Field order" className="space-y-2">
        {order.map((key, index) => {
          const custom = base.customFields.find(field => key === `custom:${field.id}`)
          const label = custom ? `${custom.name} (custom)` : STANDARD_ASSET_FIELDS[key as StandardAssetField]
          return <li key={key} data-field-key={key} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
            <span className="text-sm break-words min-w-0"><span className="text-gray-400 mr-2">{index + 1}.</span>{label}{custom && !custom.isActive && <span className="text-gray-500"> — inactive</span>}</span>
            <span className="flex shrink-0 gap-1">
              <button type="button" aria-label={`Move ${label} up`} disabled={busy || index === 0} onClick={() => move(index, -1)} className="border rounded p-2 hover:bg-gray-50 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label={`Move ${label} down`} disabled={busy || index === order.length - 1} onClick={() => move(index, 1)} className="border rounded p-2 hover:bg-gray-50 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            </span>
          </li>
        })}
      </ol>
    </div>
    <div className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-end gap-3">
      <button type="button" disabled={busy} onClick={() => { setOrder(defaultAssetFieldOrder(base.customFields)); setReset(true); setAnnouncement('Default order restored in draft. Save to apply.') }} className="mr-auto text-sm underline disabled:opacity-50">Reset to default</button>
      <button type="button" disabled={busy} onClick={onClose} className="border rounded px-3 py-2 text-sm">Cancel</button>
      <button type="button" disabled={busy} onClick={save} className="rounded bg-primary-600 text-white px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save field order'}</button>
    </div>
  </dialog>
}
