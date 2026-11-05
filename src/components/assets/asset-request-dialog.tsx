'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, ErrorMessage } from '@/components/feedback/shared'
import { fetchAssetJson } from '@/lib/assets/client'
import { useAuthStore } from '@/store/auth'

export const assetControl = 'min-h-11 sm:min-h-9 rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'
export const assetButton = 'inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-1.5 rounded border border-gray-300 px-3 text-xs font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50'
export const assetPrimary = 'inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-1.5 rounded bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50'

export function AssetRequestDialog({ asset, close, created }: {
  asset: { id: string; name: string; equipmentId?: string | null }
  close: () => void
  created?: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null), client = useQueryClient()
  const opener = useRef(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null)
  const userId = useAuthStore(state => state.user?.id)
  const [form, setForm] = useState({ purpose: '', projectId: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', notes: '' })
  const projects = useQuery({ queryKey: ['projects', 'request-options', userId], enabled: !!userId, retry: false,
    queryFn: async ({ signal }) => {
      const data = await fetchAssetJson<{ id: string; title: string }[] | { projects: { id: string; title: string }[] }>('/api/project', signal)
      return Array.isArray(data) ? data : data.projects || []
    },
  })
  const mutation = useMutation({ mutationFn: () => api(`/api/assets/${asset.id}/requests`, {
    purpose: form.purpose.trim(), projectId: form.projectId || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, notes: form.notes.trim() || undefined,
  }), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['asset', asset.id] })
    void client.invalidateQueries({ queryKey: ['asset-requests'] })
    toast.success('Request submitted for approval.')
    close(); created?.()
  } })
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close(); opener.current?.focus() }
  }, [])
  return <dialog ref={dialog} aria-labelledby="asset-request-title" aria-describedby="asset-request-selection" onCancel={event => { event.preventDefault(); if (!mutation.isPending) close() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-0 text-gray-900 backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div className="min-w-0"><h2 id="asset-request-title" className="text-sm font-semibold">Request Asset</h2><p id="asset-request-selection" className="mt-1 break-words text-xs text-gray-600">{asset.equipmentId && asset.equipmentId !== asset.name ? `${asset.equipmentId} · ` : ''}{asset.name}</p></div>
      <button type="button" aria-label="Close request form" onClick={close} disabled={mutation.isPending} className={`${assetButton} shrink-0 border-0 px-2`}><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>
    <form onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate() }} className="space-y-4 p-4 text-xs">
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <div><label htmlFor="request-purpose" className="mb-1 block font-medium">Purpose <span className="text-red-700">*</span></label><textarea autoFocus id="request-purpose" className={`${assetControl} w-full`} rows={3} required value={form.purpose} onChange={event => setForm({ ...form, purpose: event.target.value })} placeholder="What do you need this asset for?" /></div>
        <div><label htmlFor="request-project" className="mb-1 block font-medium">Project (Optional)</label><select id="request-project" className={`${assetControl} w-full`} value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">{projects.isPending ? 'Loading projects…' : 'No project'}</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select><ErrorMessage error={projects.error} retry={() => { void projects.refetch() }} /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label htmlFor="request-start" className="mb-1 block font-medium">Start Date</label><input id="request-start" type="date" className={`${assetControl} w-full min-w-0`} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} /></div>
          <div><label htmlFor="request-end" className="mb-1 block font-medium">End Date</label><input id="request-end" type="date" className={`${assetControl} w-full min-w-0`} min={form.startDate || undefined} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })} /></div>
        </div>
        <div><label htmlFor="request-notes" className="mb-1 block font-medium">Notes (Optional)</label><textarea id="request-notes" className={`${assetControl} w-full`} rows={2} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Location, timing or other details" /></div>
      </fieldset>
      <ErrorMessage error={mutation.error} />
      <p className="text-xs text-gray-600">Your request will be submitted for approval.</p>
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-3"><button type="button" className={assetButton} disabled={mutation.isPending} onClick={close}>Cancel</button><button type="submit" className={assetPrimary} disabled={mutation.isPending || !form.purpose.trim()}>{mutation.isPending ? 'Submitting…' : 'Submit Request'}</button></div>
    </form>
  </dialog>
}
